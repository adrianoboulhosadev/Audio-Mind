import { UseCase } from 'shared'
import { TaskRepository } from '../providers'

/**
 * Drops the tasks of a recording. Idempotent — deleting what is not there is a
 * no-op, because this runs as part of the app layer's delete cascade and a
 * recording that never got a summary simply has none.
 */
export default class DeleteRecordingTasks implements UseCase<string, void> {
  constructor(private readonly repository: TaskRepository) {}

  async execute(recordingId: string): Promise<void> {
    await this.repository.deleteByRecording(recordingId)
  }
}
