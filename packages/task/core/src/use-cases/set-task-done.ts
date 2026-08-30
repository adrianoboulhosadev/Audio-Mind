import { UseCase, NotFoundError, Errors } from 'shared'
import { TaskRepository } from '../providers'

interface Input {
  taskId: string
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  ownerId: string
  done: boolean
}

/**
 * Ticks a task off, or puts it back.
 *
 * Someone else's task answers exactly like a missing one: a task quotes what was
 * said in a private recording, so confirming that an id exists would already
 * leak something.
 */
export default class SetTaskDone implements UseCase<Input, void> {
  constructor(private readonly repository: TaskRepository) {}

  async execute({ taskId, ownerId, done }: Input): Promise<void> {
    const task = await this.repository.findById(taskId)
    if (!task || task.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.TASK_NOT_FOUND, taskId)
    }

    if (done) task.markAsDone()
    else task.reopen()

    await this.repository.update(task)
  }
}
