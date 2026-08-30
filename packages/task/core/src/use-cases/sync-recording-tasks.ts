import { UseCase } from 'shared'
import { Task } from '../model'
import { TaskRepository } from '../providers'

interface Input {
  recordingId: string
  /** Comes from the recording, handed over as plain data by the app layer (the
   * worker) — this context imports no other. */
  ownerId: string
  /** The summary's action items, as they were written. */
  texts: string[]
}

/**
 * Turns the action items of one recording into tasks that OUTLIVE the summary
 * they came from.
 *
 * Materialized rather than derived, and that is the whole decision: a task that
 * were merely read out of the summary would have nowhere to remember it was
 * ticked, and processing the audio again would silently un-tick everything. So
 * the list is reconciled instead of rewritten — what is new is inserted (the
 * repository is idempotent on recordingId + text, so a re-run inserts nothing),
 * and what the model stopped saying is dropped ONLY while still pending.
 *
 * Empty items are skipped and duplicates collapse, for the same reason the
 * summary drops an empty bullet: a model that repeats itself produced a usable
 * summary, and refusing the whole recording over it would be absurd.
 */
export default class SyncRecordingTasks implements UseCase<Input, void> {
  constructor(private readonly repository: TaskRepository) {}

  async execute({ recordingId, ownerId, texts }: Input): Promise<void> {
    const tasks = new Map<string, Task>()
    for (const text of texts ?? []) {
      if (!text?.trim()) continue
      const task = new Task({ ownerId, recordingId, text })
      // Keyed by the NORMALIZED text (what the value object stored), which is
      // also the column the unique index is on.
      if (!tasks.has(task.text.value)) tasks.set(task.text.value, task)
    }

    await this.repository.createMany([...tasks.values()])
    await this.repository.deletePendingByRecordingExcept(recordingId, [...tasks.keys()])
  }
}
