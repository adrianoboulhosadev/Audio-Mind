import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { RecordingModule } from '../recording/recording.module'
import { PrismaTranscriptionRepository } from '../transcription/prisma-transcription-repository'
import { GroqQuestionAnswerer } from './groq-question-answerer'
import { PrismaSummaryRepository } from './prisma-summary-repository'
import { SummaryController } from './summary.controller'

@Module({
  imports: [DbModule, AuthModule, RecordingModule],
  controllers: [SummaryController],
  // Asking a question about a recording reads the transcript and talks to a
  // model, so both live here alongside the summary's own repository.
  providers: [PrismaSummaryRepository, PrismaTranscriptionRepository, GroqQuestionAnswerer],
  exports: [PrismaSummaryRepository],
})
export class SummaryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(SummaryController)
  }
}
