import { UseCase } from 'shared'
import { Annotation } from '../model'
import { AnnotationRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the body. */
  ownerId: string
  /** The app layer reads the recording FIRST, which is what answers
   * RECORDING_NOT_FOUND for someone else's audio. */
  recordingId: string
  atSeconds: number
  note?: string | null
}

/**
 * Marks a moment. A COMMAND, so it answers nothing (CQRS) — the panel re-reads
 * the recording's marks, where the new one lands in its place on the timeline.
 *
 * Duplicates are NOT refused: two marks on the same second are unusual but
 * meaningful (two notes about the same passage), and a unique index here would
 * turn a second thought into an error.
 */
export default class AddAnnotation implements UseCase<Input, void> {
  constructor(private readonly repository: AnnotationRepository) {}

  async execute({ ownerId, recordingId, atSeconds, note }: Input): Promise<void> {
    const annotation = new Annotation({ ownerId, recordingId, atSeconds, note })
    await this.repository.create(annotation)
  }
}
