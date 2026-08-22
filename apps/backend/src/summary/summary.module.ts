import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { RecordingModule } from '../recording/recording.module'
import { PrismaSummaryRepository } from './prisma-summary-repository'
import { SummaryController } from './summary.controller'

@Module({
  imports: [DbModule, AuthModule, RecordingModule],
  controllers: [SummaryController],
  providers: [PrismaSummaryRepository],
  exports: [PrismaSummaryRepository],
})
export class SummaryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(SummaryController)
  }
}
