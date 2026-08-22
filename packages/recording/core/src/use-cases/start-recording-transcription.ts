import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingRepository } from '../providers'

/**
 * System transition (pending -> transcribing), driven by the worker as it picks
 * the job up. No owner check: a queue job has no authenticated caller — the
 * only way to reach it is to already hold the recording id from the queue.
 */
export default class StartRecordingTranscription implements UseCase<string, void> {
  constructor(private readonly repository: RecordingRepository) {}

  async execute(recordingId: string): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording) NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)

    recording.startTranscription()
    await this.repository.update(recording)
  }
}
