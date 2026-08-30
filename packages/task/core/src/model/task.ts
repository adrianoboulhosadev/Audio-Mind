import { Entity, EntityProps, Errors, ValidationError } from 'shared'
import { TaskText } from './task-text'

export interface TaskProps extends EntityProps {
  /** Logical FK to the user. It is stored ON the task, and not resolved through
   * the recording, because the whole point of this context is one query that
   * answers "everything I still have to do" across the entire library. */
  ownerId?: string
  /** Logical FK to the recording it came out of — a different context, which
   * this one never imports. */
  recordingId?: string
  text?: string
  /** When it was ticked off, or null while it is still pending. A timestamp and
   * not a boolean: "done" always wants to say WHEN, and null is the same "not
   * yet" the inbox uses for `readAt`. */
  doneAt?: Date | null
  createdAt?: Date
}

/**
 * Something the audio said somebody has to do (rich entity).
 *
 * The TEXT is frozen at creation, exactly like the summary it came from: it is a
 * record of what was agreed in that recording, not a note the user keeps
 * editing. What does change is whether it is done — and that is the one piece of
 * state here that the person owns rather than the model.
 */
export class Task extends Entity<Task, TaskProps> {
  readonly ownerId: string
  readonly recordingId: string
  readonly text: TaskText
  readonly createdAt: Date
  doneAt: Date | null

  constructor(props: TaskProps) {
    super(props)
    const ownerId = props.ownerId?.trim() ?? ''
    if (!ownerId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'ownerId')

    const recordingId = props.recordingId?.trim() ?? ''
    if (!recordingId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'recordingId')

    this.ownerId = ownerId
    this.recordingId = recordingId
    this.text = new TaskText(props.text)
    this.doneAt = props.doneAt ?? null
    this.createdAt = props.createdAt ?? new Date()
  }

  get isDone(): boolean {
    return this.doneAt !== null
  }

  /** Idempotent: ticking something already done keeps the FIRST timestamp — the
   * moment it was actually finished, not the moment of a double click. */
  markAsDone(): void {
    if (this.doneAt) return
    this.doneAt = new Date()
  }

  /** Back to pending. Ticking the wrong line has to be undoable, otherwise the
   * list stops being trustworthy and people stop ticking anything. */
  reopen(): void {
    this.doneAt = null
  }
}
