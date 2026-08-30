import { AggregateRoot, ConflictError, EntityProps, Errors, ValidationError } from 'shared'
import { AudioAllowance, AudioFile } from './audio-file'
import { RecordingKind, toRecordingKind } from './recording-kind'
import { RecordingTitle } from './recording-title'
import { RecordingFailed, RecordingReady } from './events'

/** How the audio got here. Recording in the browser and picking a file are the
 * same thing to the pipeline — the distinction is kept only because it is what
 * the user did, and the UI says so. */
export type RecordingSource = 'record' | 'upload'
export const RECORDING_SOURCES: readonly RecordingSource[] = ['record', 'upload']

/**
 * The pipeline, as a state machine:
 *
 *   pending -> transcribing -> summarizing -> ready
 *      \___________|_______________|______-> failed -> (retry) -> pending
 *
 * `ready` is terminal: an audio that already has its summary is never dragged
 * back into the pipeline, which is what makes a re-delivered job harmless.
 */
export type RecordingStatus = 'pending' | 'transcribing' | 'summarizing' | 'ready' | 'failed'

export interface RecordingProps extends EntityProps {
  /** Logical FK to the user. Recording owns no identity. */
  ownerId?: string
  title?: string
  /** What kind of audio it is — it picks the summary TEMPLATE. Unknown (or
   * absent, which is every row that existed before this) reads as the generic
   * one. */
  kind?: RecordingKind
  source?: RecordingSource
  audioUrl?: string
  mimeType?: string
  sizeBytes?: number
  durationSeconds?: number
  status?: RecordingStatus
  failureReason?: string | null
  /**
   * How much audio the caller was allowed to hand over. Set ONLY on the way in
   * (the upload use case reads it from who is asking); a repository
   * reconstituting a row leaves it out, so a recording that was already
   * admitted keeps loading even if the ceilings move later.
   */
  admissionAllowance?: AudioAllowance
  createdAt?: Date
  updatedAt?: Date
}

/**
 * The audio the user recorded or uploaded, and how far along its processing is
 * (rich aggregate).
 *
 * Every transition is a METHOD that enforces its own precondition — the use
 * cases never write `status = x`. That is what keeps a duplicated queue job, a
 * double click or a worker retry from summarizing something that was never
 * transcribed: the entity refuses, instead of each caller remembering to check.
 */
export class Recording extends AggregateRoot<Recording, RecordingProps> {
  static readonly MAX_FAILURE_REASON_LENGTH = 300

  readonly ownerId: string
  readonly source: RecordingSource
  readonly audio: AudioFile
  readonly createdAt: Date
  title: RecordingTitle
  kind: RecordingKind
  status: RecordingStatus
  failureReason: string | null
  updatedAt: Date

  constructor(props: RecordingProps) {
    super(props)
    const ownerId = props.ownerId?.trim() ?? ''
    if (!ownerId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'ownerId')

    this.ownerId = ownerId
    this.title = new RecordingTitle(props.title)
    this.kind = toRecordingKind(props.kind)
    this.source = props.source && RECORDING_SOURCES.includes(props.source) ? props.source : 'upload'
    this.audio = new AudioFile({
      url: props.audioUrl,
      mimeType: props.mimeType,
      sizeBytes: props.sizeBytes,
      durationSeconds: props.durationSeconds,
      admissionLimits: props.admissionAllowance
        ? AudioFile.limitsFor(props.admissionAllowance)
        : undefined,
    })
    this.status = props.status ?? 'pending'
    this.failureReason = props.failureReason ?? null
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? this.createdAt
  }

  get isReady(): boolean {
    return this.status === 'ready'
  }

  get isFailed(): boolean {
    return this.status === 'failed'
  }

  /** In the pipeline right now — the UI polls nothing, but it does show a spinner. */
  get isProcessing(): boolean {
    return this.status === 'transcribing' || this.status === 'summarizing'
  }

  /** Renaming is the ONE thing the user may change after the upload: the audio,
   * its format and its duration are what was actually recorded. */
  rename(title: string): void {
    this.title = new RecordingTitle(title)
    this.touch()
  }

  /**
   * Says what kind of audio this is, which is what decides the summary TEMPLATE.
   *
   * Editable after the upload, unlike everything else about the file, because
   * getting it wrong is easy and the cost of being stuck with it is a summary
   * shaped for the wrong thing. It only affects the NEXT run — the screen says
   * so and offers to process again, which is the button that already exists.
   */
  changeKind(kind: RecordingKind): void {
    const next = toRecordingKind(kind)
    if (next === this.kind) return

    this.kind = next
    this.touch()
  }

  /**
   * Takes the name the pipeline suggests — the summary's headline — but ONLY
   * while the audio still carries the placeholder it was created with.
   *
   * Renaming stays the user's (see `rename`): a name someone typed is never
   * overwritten by a model, however good the suggestion is. This exists because
   * the alternative is a library of "Áudio sem título" that nobody goes back to
   * rename, when the summary already knows what the audio was about.
   */
  adoptSuggestedTitle(title: string): void {
    if (!this.title.isPlaceholder) return

    const suggested = title?.trim() ?? ''
    if (!suggested) return

    this.title = new RecordingTitle(suggested.slice(0, RecordingTitle.MAX_LENGTH))
    this.touch()
  }

  /** pending -> transcribing. Idempotent for the status it already is, so a
   * re-delivered job does not blow up; any other origin is a real ordering bug. */
  startTranscription(): void {
    if (this.status === 'transcribing') return
    this.ensure('pending')
    this.status = 'transcribing'
    this.touch()
  }

  /** transcribing -> summarizing. */
  startSummarization(): void {
    if (this.status === 'summarizing') return
    this.ensure('transcribing')
    this.status = 'summarizing'
    this.touch()
  }

  /** summarizing -> ready. Records the fact the inbox is built from. */
  markAsReady(): void {
    if (this.isReady) return
    this.ensure('summarizing')
    this.status = 'ready'
    this.failureReason = null
    this.touch()
    this.record(new RecordingReady(this.id.value, this.ownerId, this.title.value))
  }

  /**
   * Anything -> failed, carrying WHY. A recording that already reached `ready`
   * is never failed retroactively (its summary exists and is readable), and
   * failing twice keeps the FIRST reason — the first failure is the real cause,
   * the retry's is usually a consequence.
   */
  fail(reason: string): void {
    if (this.isReady) ConflictError.throwError(Errors.INVALID_RECORDING_STATUS, this.status)
    if (this.isFailed) return

    const trimmed = (reason?.trim() || 'Falha ao processar o áudio.').slice(
      0,
      Recording.MAX_FAILURE_REASON_LENGTH,
    )
    this.status = 'failed'
    this.failureReason = trimmed
    this.touch()
    this.record(new RecordingFailed(this.id.value, this.ownerId, this.title.value, trimmed))
  }

  /**
   * Sends the SAME audio through the pipeline again (nothing is ever thrown
   * away — the file stays on disk).
   *
   * From `failed`, which is the obvious one. And from `ready` too: the pipeline
   * of today produces things the pipeline of last month did not — timestamps in
   * the transcript, a better model — and without this the only way to get them
   * would be to delete the recording and upload it again.
   *
   * What it refuses is a recording a job is ALREADY on (pending, transcribing,
   * summarizing): a second job over the same audio would mean two workers
   * writing the same rows. `ready` staying terminal for the WORKER is what keeps
   * a re-delivered job harmless — only this, an explicit act by the owner, moves
   * a finished recording back.
   *
   * Reprocessing REPLACES the transcript and the summary (both are upserts by
   * recordingId) and costs a full run of both models, so the screen says so
   * before asking.
   */
  retry(): void {
    if (!this.isFailed && !this.isReady) {
      ConflictError.throwError(Errors.RECORDING_IN_PIPELINE, this.status)
    }
    this.status = 'pending'
    this.failureReason = null
    this.touch()
  }

  private ensure(expected: RecordingStatus): void {
    if (this.status !== expected) {
      ConflictError.throwError(Errors.INVALID_RECORDING_STATUS, this.status, { expected })
    }
  }

  private touch(): void {
    this.updatedAt = new Date()
  }
}

