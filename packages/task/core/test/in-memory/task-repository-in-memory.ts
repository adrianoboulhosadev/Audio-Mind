import { Task, TaskDTO, TaskFilter, TaskQueryRepository, TaskRepository } from '../../src'

interface TaskRow {
  id: string
  ownerId: string
  recordingId: string
  text: string
  doneAt: Date | null
  createdAt: Date
}

/**
 * Fake of the tasks table, INCLUDING the unique index on (recordingId, text) —
 * that index is the whole idempotency guarantee of a re-processed recording, so
 * a fake without it would let a test pass on a duplicate the real database
 * refuses.
 */
export default class TaskRepositoryInMemory implements TaskRepository, TaskQueryRepository {
  private rows: TaskRow[] = []

  private serialize(task: Task): TaskRow {
    return {
      id: task.id.value,
      ownerId: task.ownerId,
      recordingId: task.recordingId,
      text: task.text.value,
      doneAt: task.doneAt,
      createdAt: task.createdAt,
    }
  }

  async findById(id: string): Promise<Task | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? new Task({ ...row }) : null
  }

  async update(task: Task): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === task.id.value)
    if (index >= 0) this.rows[index] = this.serialize(task)
  }

  async createMany(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      const row = this.serialize(task)
      const duplicate = this.rows.some(
        (current) => current.recordingId === row.recordingId && current.text === row.text,
      )
      if (!duplicate) this.rows.push(row)
    }
  }

  async deletePendingByRecordingExcept(recordingId: string, keep: string[]): Promise<void> {
    this.rows = this.rows.filter(
      (row) =>
        row.recordingId !== recordingId || row.doneAt !== null || keep.includes(row.text),
    )
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.recordingId !== recordingId)
  }

  async listByOwnerQuery(
    ownerId: string,
    filter: TaskFilter,
    limit: number,
  ): Promise<TaskDTO[]> {
    return this.rows
      .filter((row) => row.ownerId === ownerId)
      .filter((row) =>
        filter === 'all' ? true : filter === 'done' ? row.doneAt !== null : row.doneAt === null,
      )
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        recordingId: row.recordingId,
        text: row.text,
        doneAt: row.doneAt,
        createdAt: row.createdAt,
      }))
  }

  async countPendingQuery(ownerId: string): Promise<number> {
    return this.rows.filter((row) => row.ownerId === ownerId && row.doneAt === null).length
  }

  get size(): number {
    return this.rows.length
  }
}
