import { AnnotationDTO, AnnotationQueryRepository, AnnotationRepository } from '@annotation/core'
import {
  AddAnnotationController,
  DeleteAnnotationController,
  DeleteRecordingAnnotationsController,
  EditAnnotationNoteController,
  ListMyAnnotationsController,
  ListRecordingAnnotationsController,
} from '../controllers'
import { AddAnnotationInput } from '../@types'

/**
 * Single entry point the backend calls. The worker wires none of it: the
 * pipeline never marks anything — these are the user's own marks, and they are
 * exactly what must survive it re-running.
 */
export default class AnnotationFacade {
  constructor(
    private readonly repository?: AnnotationRepository,
    private readonly queryRepository?: AnnotationQueryRepository,
  ) {}

  async addAnnotation(
    ownerId: string,
    recordingId: string,
    input: AddAnnotationInput,
  ): Promise<void> {
    await new AddAnnotationController(this.repository!).execute(ownerId, recordingId, input)
  }

  async editAnnotationNote(
    annotationId: string,
    ownerId: string,
    note?: string | null,
  ): Promise<void> {
    await new EditAnnotationNoteController(this.repository!).execute(annotationId, ownerId, note)
  }

  async deleteAnnotation(annotationId: string, ownerId: string): Promise<void> {
    await new DeleteAnnotationController(this.repository!).execute(annotationId, ownerId)
  }

  async listRecordingAnnotations(recordingId: string): Promise<AnnotationDTO[]> {
    return new ListRecordingAnnotationsController(this.queryRepository!).execute(recordingId)
  }

  async listMyAnnotations(ownerId: string, limit?: number): Promise<AnnotationDTO[]> {
    return new ListMyAnnotationsController(this.queryRepository!).execute(ownerId, limit)
  }

  async deleteRecordingAnnotations(recordingId: string): Promise<void> {
    await new DeleteRecordingAnnotationsController(this.repository!).execute(recordingId)
  }
}
