import { SyncRecordingTasks, TaskRepository } from '@task/core'

export default class SyncRecordingTasksController {
  constructor(private readonly repository: TaskRepository) {}

  async execute(input: { recordingId: string; ownerId: string; texts: string[] }): Promise<void> {
    await new SyncRecordingTasks(this.repository).execute(input)
  }
}
