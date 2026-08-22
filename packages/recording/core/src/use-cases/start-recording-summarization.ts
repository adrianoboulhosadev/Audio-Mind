import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingRepository } from '../providers'

/** System transition (transcribing -> summarizing), driven by the worker once
 * the transcript is stored. */
export default class StartRecordingSummarization implements UseCase<string, void> {
  constructor(private readonly repository: RecordingRepository) {}

  async execute(recordingId: string): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording) NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)

    recording.startSummarization()
    await this.repository.update(recording)
  }
}
