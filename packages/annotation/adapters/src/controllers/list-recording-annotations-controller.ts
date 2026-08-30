import {
  AnnotationDTO,
  AnnotationQueryRepository,
  ListRecordingAnnotationsQuery,
} from '@annotation/core'

export default class ListRecordingAnnotationsController {
  constructor(private readonly queryRepository: AnnotationQueryRepository) {}

  async execute(recordingId: string): Promise<AnnotationDTO[]> {
    return new ListRecordingAnnotationsQuery(this.queryRepository).execute(recordingId)
  }
}
