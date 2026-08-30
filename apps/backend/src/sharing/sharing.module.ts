import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { RecordingModule } from '../recording/recording.module'
import { PrismaSummaryRepository } from '../summary/prisma-summary-repository'
import { PrismaTranscriptionRepository } from '../transcription/prisma-transcription-repository'
import { PublicShareController } from './public-share.controller'
import { ShareController } from './share.controller'
import { ShareStoreModule } from './share-store.module'

/**
 * Sharing has two doors, and only one of them is authenticated. The public one
 * is a separate controller class precisely so the middleware — which is applied
 * per class — cannot reach it, the same arrangement the audio stream and the SSE
 * stream use.
 */
@Module({
  imports: [DbModule, AuthModule, RecordingModule, ShareStoreModule],
  controllers: [ShareController, PublicShareController],
  // The public page reads the summary and (when the link says so) the transcript
  // — cross-context, orchestrated here.
  providers: [PrismaTranscriptionRepository, PrismaSummaryRepository],
})
export class SharingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ShareController)
  }
}
