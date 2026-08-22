import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingDTO } from '../model'
import { RecordingQueryRepository } from '../providers'

/**
 * The SYSTEM read: the worker needs the file path, its format and its duration
 * to run the pipeline, and there is no authenticated owner behind a queue job.
 *
 * Deliberately a separate use case from `GetRecordingQuery` rather than an
 * `ownerId?` on it: an optional owner check is one forgotten argument away from
 * an unguarded read on an HTTP route. This name says who may call it.
 */
export default class GetRecordingForProcessingQuery implements UseCase<string, RecordingDTO> {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(recordingId: string): Promise<RecordingDTO> {
    const recording = await this.queryRepository.findByIdQuery(recordingId)
    if (!recording) NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)

    return recording
  }
}
