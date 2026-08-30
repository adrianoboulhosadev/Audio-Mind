import { Injectable } from '@nestjs/common'
import { Task, TaskDTO, TaskFilter, TaskQueryRepository, TaskRepository } from '@task/adapters'
import { PrismaService } from '../db/prisma.service'

interface TaskRow {
  id: string
  ownerId: string
  recordingId: string
  text: string
  doneAt: Date | null
  createdAt: Date
}

@Injectable()
export class PrismaTaskRepository implements TaskRepository, TaskQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reconstitutes the rich entity from a row, INLINE: the constructor is what
  // rebuilds the value object and re-checks the invariants.
  private reconstitute(row: TaskRow): Task {
    return new Task({ ...row })
  }

  private toDTO(row: TaskRow): TaskDTO {
    return {
      id: row.id,
      recordingId: row.recordingId,
      text: row.text,
      doneAt: row.doneAt,
      createdAt: row.createdAt,
    }
  }

  async findById(id: string): Promise<Task | null> {
    const row = await this.prisma.task.findUnique({ where: { id } })
    return row ? this.reconstitute(row) : null
  }

  // The only thing that changes after creation is whether it is done.
  async update(task: Task): Promise<void> {
    await this.prisma.task.update({
      where: { id: task.id.value },
      data: { doneAt: task.doneAt },
    })
  }

  /** Idempotent by the unique (recording_id, text): re-processing a recording
   * inserts nothing new and keeps the ticks that are already there. */
  async createMany(tasks: Task[]): Promise<void> {
    if (tasks.length === 0) return

    await this.prisma.task.createMany({
      data: tasks.map((task) => ({
        id: task.id.value,
        ownerId: task.ownerId,
        recordingId: task.recordingId,
        text: task.text.value,
        doneAt: task.doneAt,
      })),
      skipDuplicates: true,
    })
  }

  async deletePendingByRecordingExcept(recordingId: string, keep: string[]): Promise<void> {
    await this.prisma.task.deleteMany({
      where: { recordingId, doneAt: null, text: { notIn: keep } },
    })
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    await this.prisma.task.deleteMany({ where: { recordingId } })
  }

  async listByOwnerQuery(ownerId: string, filter: TaskFilter, limit: number): Promise<TaskDTO[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        ownerId,
        ...(filter === 'pending' ? { doneAt: null } : {}),
        ...(filter === 'done' ? { NOT: { doneAt: null } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((row) => this.toDTO(row))
  }

  async countPendingQuery(ownerId: string): Promise<number> {
    return this.prisma.task.count({ where: { ownerId, doneAt: null } })
  }
}
