import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingDTO } from '../model'
import { RecordingQueryRepository } from '../providers'

interface Input {
  recordingId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
}

/**
 * One recording, for its owner. Someone else's answers exactly like a missing
 * one: a recording is private, so confirming that a given id exists would leak
 * that a stranger uploaded something — the audio is not public content the way
 * a comment thread is.
 */
export default class GetRecordingQuery implements UseCase<Input, RecordingDTO> {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute({ recordingId, ownerId }: Input): Promise<RecordingDTO> {
    const recording = await this.queryRepository.findByIdQuery(recordingId)
    if (!recording || recording.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)
    }

    return recording
  }
}
