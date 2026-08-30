import { Annotation } from '../model'

/** Annotation WRITE port (command side of CQRS). */
export interface AnnotationRepository {
  create(annotation: Annotation): Promise<void>
  findById(id: string): Promise<Annotation | null>
  update(annotation: Annotation): Promise<void>
  delete(id: string): Promise<void>
  /** Every mark on a recording — part of the app layer's delete cascade. */
  deleteByRecording(recordingId: string): Promise<void>
}
