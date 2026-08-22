import { AggregateRoot, ConflictError, EntityProps, Errors, ValidationError } from 'shared'
import { AudioFile } from './audio-file'
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
  source?: RecordingSource
  audioUrl?: string
  mimeType?: string
  sizeBytes?: number
  durationSeconds?: number
  status?: RecordingStatus
  failureReason?: string | null
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
  status: RecordingStatus
  failureReason: string | null
  updatedAt: Date

  constructor(props: RecordingProps) {
    super(props)
    const ownerId = props.ownerId?.trim() ?? ''
    if (!ownerId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'ownerId')

    this.ownerId = ownerId
    this.title = new RecordingTitle(props.title)
    this.source = props.source && RECORDING_SOURCES.includes(props.source) ? props.source : 'upload'
    this.audio = new AudioFile({
      url: props.audioUrl,
      mimeType: props.mimeType,
      sizeBytes: props.sizeBytes,
      durationSeconds: props.durationSeconds,
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

  /** failed -> pending, so the SAME audio goes through the pipeline again
   * (nothing was thrown away on failure — the file is still on disk). */
  retry(): void {
    if (!this.isFailed) ConflictError.throwError(Errors.RECORDING_NOT_FAILED, this.status)
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

