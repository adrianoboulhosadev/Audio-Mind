import { DomainEvent } from 'shared'

/**
 * Raised by `UploadRecording` itself, not by the entity: creating the recording
 * IS the fact, and `Recording`'s constructor also RECONSTITUTES rows from the
 * database, so it must never record anything on its own.
 */
export class RecordingUploaded extends DomainEvent {
  constructor(
    readonly recordingId: string,
    readonly ownerId: string,
    readonly title: string,
  ) {
    super()
  }
}

/** Raised by `Recording.markAsReady()` — the transcript and the summary are in. */
export class RecordingReady extends DomainEvent {
  constructor(
    readonly recordingId: string,
    readonly ownerId: string,
    readonly title: string,
  ) {
    super()
  }
}

/** Raised by `Recording.fail(reason)`. Carries the reason because the inbox line
 * has to tell the user WHY their audio did not go through — a bare "failed" only
 * makes them upload it again. */
export class RecordingFailed extends DomainEvent {
  constructor(
    readonly recordingId: string,
    readonly ownerId: string,
    readonly title: string,
    readonly reason: string,
  ) {
    super()
  }
}
