import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { RecordingModule } from '../recording/recording.module'
import { TaskController } from './task.controller'
import { TaskStoreModule } from './task-store.module'

/**
 * The tasks screen. It needs the recording repository (imported from its module)
 * to say which audio each task came out of — the task context stores only the
 * id.
 */
@Module({
  imports: [DbModule, AuthModule, RecordingModule, TaskStoreModule],
  controllers: [TaskController],
})
export class TaskModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(TaskController)
  }
}
