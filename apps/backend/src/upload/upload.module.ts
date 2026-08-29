import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { UploadController } from './upload.controller'
import { UploadsJanitor } from './uploads-janitor'

@Module({
  imports: [AuthModule, DbModule],
  controllers: [UploadController],
  // Not a route: it sweeps the uploads root on a timer (see the class).
  providers: [UploadsJanitor],
})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UploadController)
  }
}
