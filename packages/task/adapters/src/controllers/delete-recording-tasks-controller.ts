import { DeleteRecordingTasks, TaskRepository } from '@task/core'

export default class DeleteRecordingTasksController {
  constructor(private readonly repository: TaskRepository) {}

  async execute(recordingId: string): Promise<void> {
    await new DeleteRecordingTasks(this.repository).execute(recordingId)
  }
}
