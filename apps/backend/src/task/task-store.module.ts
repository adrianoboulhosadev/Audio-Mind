import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { PrismaTaskRepository } from './prisma-task-repository'

/**
 * The tasks TABLE on its own, apart from the module that owns the tasks ROUTES.
 *
 * Same reason the notification store is split: erasing a recording has to erase
 * its tasks, so the recording module needs this repository — and the routes
 * module needs the recording module back, which would close the circle.
 */
@Module({
  imports: [DbModule],
  providers: [PrismaTaskRepository],
  exports: [PrismaTaskRepository],
})
export class TaskStoreModule {}
