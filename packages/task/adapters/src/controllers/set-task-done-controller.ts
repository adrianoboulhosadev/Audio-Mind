import { SetTaskDone, TaskRepository } from '@task/core'

export default class SetTaskDoneController {
  constructor(private readonly repository: TaskRepository) {}

  async execute(taskId: string, ownerId: string, done: boolean): Promise<void> {
    await new SetTaskDone(this.repository).execute({ taskId, ownerId, done })
  }
}
