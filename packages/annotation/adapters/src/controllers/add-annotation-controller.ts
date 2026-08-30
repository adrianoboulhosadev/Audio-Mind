import { AddAnnotation, AnnotationRepository } from '@annotation/core'
import { AddAnnotationInput } from '../@types'

export default class AddAnnotationController {
  constructor(private readonly repository: AnnotationRepository) {}

  async execute(ownerId: string, recordingId: string, input: AddAnnotationInput): Promise<void> {
    await new AddAnnotation(this.repository).execute({ ownerId, recordingId, ...input })
  }
}
