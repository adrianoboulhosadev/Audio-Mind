import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingKind } from '../model'
import { RecordingRepository } from '../providers'

interface Input {
  recordingId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
  kind: RecordingKind
}

/**
 * Says what kind of audio this is — a meeting, a class, a consultation — which
 * is what picks the summary template.
 *
 * Allowed at any status, and it only changes what the NEXT run produces: the one
 * that is happening right now already read the kind it started with. The screen
 * says exactly that and offers the reprocess button, instead of the domain
 * refusing an edit whose only cost is having to ask again later.
 */
export default class ChangeRecordingKind implements UseCase<Input, void> {
  constructor(private readonly repository: RecordingRepository) {}

  async execute({ recordingId, ownerId, kind }: Input): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording || recording.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)
    }

    recording.changeKind(kind)
    await this.repository.update(recording)
  }
}
