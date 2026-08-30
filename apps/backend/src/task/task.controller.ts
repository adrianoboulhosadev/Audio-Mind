import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { RecordingFacade } from '@recording/adapters'
import { SetTaskDoneInput, TaskDTO, TaskFacade, toTaskFilter } from '@task/adapters'
import { UserDTO } from '@auth/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { PrismaRecordingRepository } from '../recording/prisma-recording-repository'
import { PrismaTaskRepository } from './prisma-task-repository'

/**
 * One line of the tasks screen: what has to be done, and which audio it came out
 * of.
 *
 * Composed HERE, in the app layer, because it spans two contexts — the task
 * stores a recordingId and nothing else, since knowing who owns a recording (and
 * what it is called) is the recording context's job. Same shape as the search:
 * ids go over, rows come back.
 */
export interface TaskItem {
  task: TaskDTO
  recordingTitle: string
}

/**
 * Everything the user still has to do, pulled out of every summary they have.
 *
 * Nothing here calls a model: the action items were already written (and paid
 * for) when the audio was summarized — this context only gives them somewhere to
 * live and something to remember, which is whether they were done.
 */
@Controller('task')
export class TaskController {
  constructor(
    private readonly repository: PrismaTaskRepository,
    private readonly recordingRepository: PrismaRecordingRepository,
  ) {}

  private facade(): TaskFacade {
    return new TaskFacade(this.repository, this.repository)
  }

  @Get()
  async list(
    @authenticatedUser() user: UserDTO,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ): Promise<{ pendingCount: number; items: TaskItem[] }> {
    // Fail-closed in the domain: a garbage `status` reads as "pending", never as
    // "all".
    const feed = await this.facade().listMyTasks(
      user.id,
      toTaskFilter(status),
      limit ? Number(limit) : undefined,
    )

    const recordings = await new RecordingFacade(
      undefined,
      this.recordingRepository,
    ).listRecordingsByIds(
      user.id,
      feed.items.map((task) => task.recordingId),
    )
    const titles = new Map(recordings.map((recording) => [recording.id, recording.title]))

    // A task whose recording is gone is dropped rather than shown without one:
    // the cascade takes tasks with the audio, so this can only be a row that
    // outlived its recording — and a line nobody can trace back is noise.
    return {
      pendingCount: feed.pendingCount,
      items: feed.items
        .filter((task) => titles.has(task.recordingId))
        .map((task) => ({ task, recordingTitle: titles.get(task.recordingId)! })),
    }
  }

  @Patch(':id')
  async setDone(
    @authenticatedUser() user: UserDTO,
    @Param('id') id: string,
    @Body() input: SetTaskDoneInput,
  ) {
    await this.facade().setTaskDone(id, user.id, input?.done === true)
  }
}
