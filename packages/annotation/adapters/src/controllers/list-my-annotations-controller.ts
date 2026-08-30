import { AnnotationDTO, AnnotationQueryRepository, ListMyAnnotationsQuery } from '@annotation/core'

export default class ListMyAnnotationsController {
  constructor(private readonly queryRepository: AnnotationQueryRepository) {}

  async execute(ownerId: string, limit?: number): Promise<AnnotationDTO[]> {
    return new ListMyAnnotationsQuery(this.queryRepository).execute({ ownerId, limit })
  }
}
