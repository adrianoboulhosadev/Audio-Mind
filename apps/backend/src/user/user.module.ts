import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { NotificationStoreModule } from '../notification/notification-store.module'
import { RecordingModule } from '../recording/recording.module'
import { UserController } from './user.controller'

@Module({
  // Deleting the account erases the whole library and the whole inbox with it,
  // so this module needs the recording eraser and the notification store.
  imports: [DbModule, AuthModule, RecordingModule, NotificationStoreModule],
  controllers: [UserController],
})
export class UserModule implements NestModule {
  // Applied per CLASS, not by path string: adding a route to the controller
  // cannot accidentally leave it unauthenticated.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UserController)
  }
}
