import { ListMyTasksQuery, TaskFeedDTO, TaskFilter, TaskQueryRepository } from '@task/core'

export default class ListMyTasksController {
  constructor(private readonly queryRepository: TaskQueryRepository) {}

  async execute(ownerId: string, filter?: TaskFilter, limit?: number): Promise<TaskFeedDTO> {
    return new ListMyTasksQuery(this.queryRepository).execute({ ownerId, filter, limit })
  }
}
