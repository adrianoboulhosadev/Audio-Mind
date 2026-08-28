import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { ValidationError, Errors } from 'shared'
import { AudioFile } from '@recording/adapters'
import { UserDTO } from '@auth/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { allowanceFor } from '../auth/upload-allowance'
import { AudioUploadInterceptor } from './audio-upload.interceptor'
import { AUDIO_SUBDIR, UPLOADS_URL_PREFIX, normalizeMimeType } from './uploads.config'

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
  /**
   * What the CALLER is allowed to send. The front asks before offering a file
   * picker, so the browser can refuse an over-sized file without spending the
   * upload — and so the copy on screen ("até 25 MB") is the domain's number
   * rather than a constant someone typed twice.
   */
  @Get('allowance')
  allowance(@authenticatedUser() user: UserDTO) {
    const limits = AudioFile.limitsFor(allowanceFor(user))
    return {
      maxSizeBytes: limits.maxSizeBytes,
      maxDurationSeconds: limits.maxDurationSeconds,
      mimeTypes: AudioFile.SUPPORTED_MIME_TYPES,
    }
  }

  @Post('audios')
  // Not Nest's FileInterceptor: the size ceiling depends on who is uploading,
  // and FileInterceptor fixes its multer options at decoration time.
  @UseInterceptors(AudioUploadInterceptor)
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
