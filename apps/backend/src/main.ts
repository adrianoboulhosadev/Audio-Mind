import * as dotenv from 'dotenv'
dotenv.config()
import cookieParser from 'cookie-parser'
import { mkdirSync } from 'fs'
import { join } from 'path'

import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { DomainExceptionFilter } from './shared/domain-exception.filter'
import { UPLOADS_DIR, UPLOADS_SUBDIRS } from './upload/uploads.config'

async function bootstrap() {
  // Local (no cloud) file storage: multer does not create its destination, so
  // the per-theme subfolders have to exist before the first upload lands.
  for (const subdir of UPLOADS_SUBDIRS) {
    mkdirSync(join(UPLOADS_DIR, subdir), { recursive: true })
  }

  // CORS with credentials: the SPA sends the refresh cookie, so it needs a
  // specific origin (a wildcard is not allowed together with credentials).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true },
  })
  app.use(cookieParser())
  app.useGlobalFilters(new DomainExceptionFilter())

  // NOTE: the uploads folder is deliberately NOT served statically. Audio and
  // summaries are private, and a static mount would hand every file to anyone
  // who learned its URL — they are streamed by the authenticated routes
  // /recording/:id/audio and /summary/recording/:id/pdf instead.
  await app.listen(process.env.PORT ?? 5000)
}
bootstrap()
