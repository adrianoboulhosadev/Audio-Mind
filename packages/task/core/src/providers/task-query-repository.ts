import { TaskDTO, TaskFilter } from '../model'

/** Task READ port (query side of CQRS). */
export interface TaskQueryRepository {
  /** The owner's tasks for that slice, newest first, capped at `limit`. */
  listByOwnerQuery(ownerId: string, filter: TaskFilter, limit: number): Promise<TaskDTO[]>
  /** How many are still open in the WHOLE list, independent of the slice read. */
  countPendingQuery(ownerId: string): Promise<number>
}
