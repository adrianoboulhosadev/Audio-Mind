import { Entity, EntityProps, Errors, ValidationError } from 'shared'
import { AnnotationNote } from './annotation-note'
import { AnnotationTime } from './annotation-time'

export interface AnnotationProps extends EntityProps {
  /** Logical FK to the user. Stored here so "todos os meus marcadores" is ONE
   * query, instead of a join through every recording they own. */
  ownerId?: string
  /** Logical FK to the recording — a different context, never imported here. */
  recordingId?: string
  atSeconds?: number
  /** Null for a plain mark. */
  note?: string | null
  createdAt?: Date
  updatedAt?: Date
}

/**
 * A point in a recording somebody wanted to come back to (rich entity) — with or
 * without something written about it.
 *
 * A "marcador" and an "anotação" are the SAME thing here, and deliberately so:
 * the difference is whether the note is filled in, and making them two entities
 * would mean two tables, two screens and a migration the day somebody adds words
 * to a mark they already made.
 *
 * The anchor is the TIME, not a transcript segment. That is what makes an
 * annotation survive re-processing: the audio does not change, so second 412 is
 * still second 412 — while the segments around it may be redrawn by a better
 * model, or appear for the first time.
 */
export class Annotation extends Entity<Annotation, AnnotationProps> {
  readonly ownerId: string
  readonly recordingId: string
  readonly at: AnnotationTime
  readonly createdAt: Date
  note: AnnotationNote | null
  updatedAt: Date

  constructor(props: AnnotationProps) {
    super(props)
    const ownerId = props.ownerId?.trim() ?? ''
    if (!ownerId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'ownerId')

    const recordingId = props.recordingId?.trim() ?? ''
    if (!recordingId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'recordingId')

    this.ownerId = ownerId
    this.recordingId = recordingId
    this.at = new AnnotationTime(props.atSeconds)
    this.note = AnnotationNote.from(props.note)
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? this.createdAt
  }

  get hasNote(): boolean {
    return this.note !== null
  }

  /**
   * Writes (or rewrites, or erases) what this mark says. Editable because these
   * words are the user's own — unlike a summary or a task, nothing here is a
   * record of what a model produced.
   *
   * Clearing the text turns it back into a plain mark instead of deleting it:
   * the person still asked to remember that moment.
   */
  editNote(note?: string | null): void {
    this.note = AnnotationNote.from(note)
    this.updatedAt = new Date()
  }
}
