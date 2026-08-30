import { UseCase, EventPublisher } from 'shared'
import {
  AudioAllowance,
  Recording,
  RecordingKind,
  RecordingSource,
  RecordingUploaded,
} from '../model'
import { RecordingProcessingQueue, RecordingRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  ownerId: string
  title: string
  /** Which summary template to use. Fail-closed in the entity: absent or
   * unknown reads as the generic one. */
  kind?: RecordingKind
  source: RecordingSource
  /** Relative path returned by POST /upload/audios — the bytes are already on
   * disk by the time this runs (same two-step shape the front uses everywhere). */
  audioUrl: string
  mimeType: string
  sizeBytes: number
  /** Measured in the browser before uploading; the AudioFile VO is what decides
   * whether it is acceptable. */
  durationSeconds: number
  /** Resolved from the CALLER's role at the HTTP boundary, next to ownerId and
   * for the same reason: it decides the ceilings, so it can never come from the
   * body a client controls. Omitted = the tight allowance. */
  allowance?: AudioAllowance
}

/**
 * Registers the audio and parks it for processing. All the rules (format, size,
 * duration, title) belong to the value objects the entity builds — this use case
 * only orchestrates: create, persist, enqueue, publish.
 *
 * ORDER MATTERS: the job is enqueued only AFTER the row exists, otherwise a fast
 * worker picks up an id the database has never heard of.
 */
export default class UploadRecording implements UseCase<Input, void> {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly queue?: RecordingProcessingQueue,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: Input): Promise<void> {
    const recording = new Recording({
      ownerId: input.ownerId,
      title: input.title,
      kind: input.kind,
      source: input.source,
      audioUrl: input.audioUrl,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      durationSeconds: input.durationSeconds,
      admissionAllowance: input.allowance ?? 'standard',
    })

    await this.repository.create(recording)
    await this.queue?.enqueue(recording.id.value)
    await this.eventPublisher?.publish([
      new RecordingUploaded(recording.id.value, recording.ownerId, recording.title.value),
    ])
  }
}
