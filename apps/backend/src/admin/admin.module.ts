import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { RecordingModule } from '../recording/recording.module'
import { AdminController } from './admin.controller'
import { AdminGuard } from './admin.guard'

/**
 * Middleware first (who is calling), guard second (are they an admin) — that
 * order is why the guard can simply read `request.user` instead of parsing a
 * token of its own.
 */
@Module({
  imports: [DbModule, AuthModule, RecordingModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(AdminController)
  }
}
