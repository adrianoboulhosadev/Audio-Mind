import { TaskFeedDTO, TaskFilter, TaskQueryRepository, TaskRepository } from '@task/core'
import {
  DeleteRecordingTasksController,
  ListMyTasksController,
  SetTaskDoneController,
  SyncRecordingTasksController,
} from '../controllers'

/**
 * Single entry point the apps call: the WORKER materializes the tasks at the end
 * of the pipeline, the BACKEND lists them, ticks them and drops them with the
 * recording. Optional ports, so each app wires only the side it uses.
 */
export default class TaskFacade {
  constructor(
    private readonly repository?: TaskRepository,
    private readonly queryRepository?: TaskQueryRepository,
  ) {}

  /** Reconciles one recording's tasks with what its summary now says. */
  async syncRecordingTasks(input: {
    recordingId: string
    ownerId: string
    texts: string[]
  }): Promise<void> {
    await new SyncRecordingTasksController(this.repository!).execute(input)
  }

  async listMyTasks(ownerId: string, filter?: TaskFilter, limit?: number): Promise<TaskFeedDTO> {
    return new ListMyTasksController(this.queryRepository!).execute(ownerId, filter, limit)
  }

  async setTaskDone(taskId: string, ownerId: string, done: boolean): Promise<void> {
    await new SetTaskDoneController(this.repository!).execute(taskId, ownerId, done)
  }

  async deleteRecordingTasks(recordingId: string): Promise<void> {
    await new DeleteRecordingTasksController(this.repository!).execute(recordingId)
  }
}
