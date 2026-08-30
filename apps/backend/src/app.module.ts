import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { DbModule } from './db/db.module'
import { HealthModule } from './health/health.module'
import { NotificationModule } from './notification/notification.module'
import { RecordingModule } from './recording/recording.module'
import { SummaryModule } from './summary/summary.module'
import { TaskModule } from './task/task.module'
import { TranscriptionModule } from './transcription/transcription.module'
import { UploadModule } from './upload/upload.module'
import { UserModule } from './user/user.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    HealthModule,
    AuthModule,
    UserModule,
    UploadModule,
    RecordingModule,
    TranscriptionModule,
    SummaryModule,
    TaskModule,
    NotificationModule,
  ],
})
export class AppModule {}
