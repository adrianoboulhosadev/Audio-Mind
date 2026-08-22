import { UseCase, NotFoundError, Errors } from 'shared'
import { TranscriptionDTO } from '../model'
import { TranscriptionQueryRepository } from '../providers'

/**
 * The transcript of one recording. There is NO owner check here on purpose:
 * this context knows nothing about who owns a recording. The backend resolves
 * ownership against the recording FIRST and only then asks for the transcript —
 * the same cross-context shape used everywhere else in the project.
 */
export default class GetTranscriptionQuery implements UseCase<string, TranscriptionDTO> {
  constructor(private readonly queryRepository: TranscriptionQueryRepository) {}

  async execute(recordingId: string): Promise<TranscriptionDTO> {
    const transcription = await this.queryRepository.findByRecordingQuery(recordingId)
    if (!transcription) NotFoundError.throwError(Errors.TRANSCRIPTION_NOT_FOUND, recordingId)

    return transcription
  }
}
