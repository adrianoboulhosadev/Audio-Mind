import { UseCase } from 'shared'
import { AnnotationDTO } from '../model'
import { AnnotationQueryRepository } from '../providers'

/**
 * One recording's marks, in the order they happen in the audio. No owner check
 * here: this context knows nothing about who owns a recording — the backend
 * reads the recording first and only then asks for its marks (the same
 * cross-context shape the transcript and the summary use).
 */
export default class ListRecordingAnnotationsQuery implements UseCase<string, AnnotationDTO[]> {
  constructor(private readonly queryRepository: AnnotationQueryRepository) {}

  async execute(recordingId: string): Promise<AnnotationDTO[]> {
    return this.queryRepository.listByRecordingQuery(recordingId)
  }
}
