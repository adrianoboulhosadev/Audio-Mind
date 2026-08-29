import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { NotificationStoreModule } from '../notification/notification-store.module'
import { PrismaSummaryRepository } from '../summary/prisma-summary-repository'
import { PrismaTranscriptionRepository } from '../transcription/prisma-transcription-repository'
import { BullMqRecordingProcessingQueue } from './bullmq-recording-processing-queue'
import { PrismaRecordingRepository } from './prisma-recording-repository'
import { AudioAccessGuard } from './audio-access.guard'
import { RecordingController } from './recording.controller'
import { RecordingEraser } from './recording-eraser'
import { RecordingStreamController } from './recording-stream.controller'

@Module({
  imports: [DbModule, AuthModule, NotificationStoreModule],
  controllers: [RecordingController, RecordingStreamController],
  providers: [
    PrismaRecordingRepository,
    // The delete cascade is cross-context and lives in the eraser, so it needs
    // both derived repositories here.
    PrismaTranscriptionRepository,
    PrismaSummaryRepository,
    RecordingEraser,
    AudioAccessGuard,
    BullMqRecordingProcessingQueue,
  ],
  // The eraser is exported because erasing an ACCOUNT means erasing the whole
  // library first (UserController), with the same cascade in the same order.
  exports: [PrismaRecordingRepository, RecordingEraser],
})
export class RecordingModule implements NestModule {
  // Only the REST controller: the audio stream authenticates by guard, because
  // an <audio> element cannot send an Authorization header (see
  // AudioAccessGuard).
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(RecordingController)
  }
}
