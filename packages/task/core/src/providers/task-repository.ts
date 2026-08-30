import { Task } from '../model'

/**
 * Task WRITE port (command side of CQRS).
 *
 * `createMany` must be IDEMPOTENT on (recordingId, text), the same way the
 * inbox is on its own triple: processing a recording again produces the same
 * action items, and a second run has to be a no-op instead of a second copy of
 * every line — which would also throw away the ticks the user had already made.
 */
export interface TaskRepository {
  findById(id: string): Promise<Task | null>
  update(task: Task): Promise<void>
  createMany(tasks: Task[]): Promise<void>
  /**
   * Drops the tasks of this recording that are still PENDING and whose text is
   * no longer among `keep` — what a re-run of the model stopped mentioning.
   *
   * Only the pending ones: a task the person already ticked is a record of
   * something they DID, and no later reading of the audio gets to erase that.
   */
  deletePendingByRecordingExcept(recordingId: string, keep: string[]): Promise<void>
  /** Everything this recording produced — part of the app layer's delete cascade. */
  deleteByRecording(recordingId: string): Promise<void>
}
