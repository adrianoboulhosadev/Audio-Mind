import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { RecordingModule } from '../recording/recording.module'
import { AnnotationController } from './annotation.controller'
import { AnnotationStoreModule } from './annotation-store.module'

@Module({
  imports: [DbModule, AuthModule, RecordingModule, AnnotationStoreModule],
  controllers: [AnnotationController],
})
export class AnnotationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(AnnotationController)
  }
}
