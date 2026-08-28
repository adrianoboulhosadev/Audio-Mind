import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { Request, Response } from 'express'
import multer from 'multer'
import { extname } from 'path'
import { Observable } from 'rxjs'
import { Errors, ValidationError } from 'shared'
import { AudioFile } from '@recording/adapters'
import { RequestWithUser } from '../auth/auth.middleware'
import { allowanceFor } from '../auth/upload-allowance'
import { AUDIO_UPLOAD_DIR, normalizeMimeType } from './uploads.config'

/**
 * Receives the audio bytes with a size ceiling that depends on WHO is uploading.
 *
 * Nest's `FileInterceptor` takes its multer options once, at decoration time, so
 * it cannot answer "25 MB for this caller, 1 GB for that one". Running multer
 * ourselves per request is what makes the ceiling the caller's own — and it
 * matters that the ceiling is enforced by multer rather than checked afterwards:
 * multer aborts the stream mid-upload, so an ordinary account cannot push a
 * gigabyte onto the disk and only then be told no.
 *
 * It also lets an over-sized upload answer with a DOMAIN error. The stock
 * interceptor throws Nest's PayloadTooLargeException, whose body is not the
 * `{ statusCode, errors: [{ code }] }` envelope the front knows how to read.
 */
@Injectable()
export class AudioUploadInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>()
    const response = context.switchToHttp().getResponse<Response>()

    // The AuthMiddleware already ran (it is applied to the whole controller), so
    // the identity — and therefore the ceiling — is known before a byte lands.
    const limits = AudioFile.limitsFor(allowanceFor((request as RequestWithUser).user))

    const upload = multer({
      storage: multer.diskStorage({
        destination: AUDIO_UPLOAD_DIR,
        // A uuid, never the client's filename: it would let a request choose
        // where the file lands and what it overwrites.
        filename: (_request, file, callback) =>
          callback(null, `${randomUUID()}${extname(file.originalname) || '.webm'}`),
      }),
      // The SAME list the AudioFile value object enforces: rejecting here saves
      // the whole upload before the domain would refuse it anyway.
      fileFilter: (_request, file, callback) =>
        callback(null, AudioFile.isSupported(normalizeMimeType(file.mimetype))),
      limits: { fileSize: limits.maxSizeBytes },
    }).single('file')

    await new Promise<void>((resolve, reject) => {
      upload(request, response, (error?: unknown) => {
        if (!error) return resolve()
        if (isFileTooLarge(error)) {
          // `max` is what THIS caller was allowed, so the message the user reads
          // is about their own account and not about some global constant.
          try {
            ValidationError.throwError(Errors.AUDIO_TOO_LARGE, undefined, {
              max: limits.maxSizeBytes,
            })
          } catch (domainError) {
            return reject(domainError)
          }
        }
        return reject(error)
      })
    })

    return next.handle()
  }
}

function isFileTooLarge(error: unknown): boolean {
  return (error as { code?: string })?.code === 'LIMIT_FILE_SIZE'
}
