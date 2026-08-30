import { AnnotationDTO } from '../model'

/** Annotation READ port (query side of CQRS). */
export interface AnnotationQueryRepository {
  /** One recording's marks, in the order they happen in the audio — which is the
   * order the screen shows them next to the player. */
  listByRecordingQuery(recordingId: string): Promise<AnnotationDTO[]>
  /** The owner's marks across the whole library, newest first, capped. */
  listByOwnerQuery(ownerId: string, limit: number): Promise<AnnotationDTO[]>
}
