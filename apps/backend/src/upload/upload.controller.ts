import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { randomUUID } from 'crypto'
import { extname } from 'path'
import { ValidationError, Errors } from 'shared'
import { AudioFile } from '@recording/adapters'
import { AUDIO_SUBDIR, AUDIO_UPLOAD_DIR, UPLOADS_URL_PREFIX, normalizeMimeType } from './uploads.config'

/**
 * The first half of the two-step upload: the bytes land here and the answer is
 * the path the client then posts to POST /recording. Splitting it this way is
 * what lets the recording use case stay about the DOMAIN (title, format, size,
 * duration) instead of about multipart parsing.
 *
 * Not admin-anything: this is the user's own audio. The AuthMiddleware is
 * applied to the class, so an anonymous request never reaches disk.
 */
@Controller('upload')
export class UploadController {
  @Post('audios')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: AUDIO_UPLOAD_DIR,
        // A uuid, never the client's filename: it would let a request choose
        // where the file lands and what it overwrites.
        filename: (_request, file, callback) =>
          callback(null, `${randomUUID()}${extname(file.originalname) || '.webm'}`),
      }),
      // The SAME list the AudioFile value object enforces (re-exported by
      // @recording/adapters): rejecting here saves 25 MB of upload before the
      // domain would refuse it anyway.
      fileFilter: (_request, file, callback) =>
        callback(null, AudioFile.isSupported(normalizeMimeType(file.mimetype))),
      limits: { fileSize: AudioFile.MAX_SIZE_BYTES },
    }),
  )
  uploadAudio(@UploadedFile() file?: Express.Multer.File) {
    // An unsupported type makes the filter drop the file silently — multer has
    // no way to answer for us, so the absence IS the rejection.
    if (!file) ValidationError.throwError(Errors.UNSUPPORTED_AUDIO_FORMAT)

    return {
      url: `${UPLOADS_URL_PREFIX}${AUDIO_SUBDIR}/${file!.filename}`,
      mimeType: normalizeMimeType(file!.mimetype),
      sizeBytes: file!.size,
    }
  }
}
