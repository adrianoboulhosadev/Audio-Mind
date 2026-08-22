import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { NotificationStoreModule } from '../notification/notification-store.module'
import { PrismaSummaryRepository } from '../summary/prisma-summary-repository'
import { PrismaTranscriptionRepository } from '../transcription/prisma-transcription-repository'
import { BullMqRecordingProcessingQueue } from './bullmq-recording-processing-queue'
import { PrismaRecordingRepository } from './prisma-recording-repository'
import { RecordingController } from './recording.controller'

@Module({
  imports: [DbModule, AuthModule, NotificationStoreModule],
  controllers: [RecordingController],
  providers: [
    PrismaRecordingRepository,
    // The delete cascade is cross-context and lives in the controller, so it
    // needs both derived repositories here.
    PrismaTranscriptionRepository,
    PrismaSummaryRepository,
    BullMqRecordingProcessingQueue,
  ],
  exports: [PrismaRecordingRepository],
})
export class RecordingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(RecordingController)
  }
}
