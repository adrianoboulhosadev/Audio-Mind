import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { NotificationController } from './notification.controller'
import { NotificationStreamController } from './notification-stream.controller'
import { NotificationStoreModule } from './notification-store.module'
import { StreamAuthGuard } from './stream-auth.guard'

@Module({
  imports: [DbModule, AuthModule, NotificationStoreModule],
  controllers: [NotificationController, NotificationStreamController],
  providers: [StreamAuthGuard],
})
export class NotificationModule implements NestModule {
  // Only the REST controller: the stream authenticates by guard, because
  // EventSource cannot send an Authorization header (see StreamAuthGuard).
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(NotificationController)
  }
}
