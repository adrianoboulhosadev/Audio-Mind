import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { RecordingModule } from '../recording/recording.module'
import { PrismaTranscriptionRepository } from './prisma-transcription-repository'
import { TranscriptionController } from './transcription.controller'

@Module({
  imports: [DbModule, AuthModule, RecordingModule],
  controllers: [TranscriptionController],
  providers: [PrismaTranscriptionRepository],
  exports: [PrismaTranscriptionRepository],
})
export class TranscriptionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(TranscriptionController)
  }
}
