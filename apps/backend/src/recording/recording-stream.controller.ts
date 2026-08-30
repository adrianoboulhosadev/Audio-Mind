import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express'
import { RecordingFacade } from '@recording/adapters'
import { resolveUploadPath } from '../upload/uploads.config'
import { streamAudioFile } from './audio-response'
import { AudioAccessGuard, RequestWithAudioUser } from './audio-access.guard'
import { PrismaRecordingRepository } from './prisma-recording-repository'

/**
 * Serves the audio bytes to a `<audio>` element, honouring Range.
 *
 * Its own controller because it is authenticated by GUARD (capability token in
 * the query string) instead of by the AuthMiddleware, which is applied per
 * CLASS and reads the Authorization header — the same reason the SSE stream has
 * its own controller.
 *
 * Range is the whole point: without it the browser has to download the entire
 * file before it can play a second of it, which is what the front used to do.
 * With it, pressing play on an hour-long recording starts in a moment, and
 * jumping to a line of the transcript fetches only the bytes around that
 * moment. How the bytes travel lives in `streamAudioFile`, shared with the
 * share-link route — what differs between the two is the authorization, not the
 * 206.
 */
@Controller('recording/stream')
export class RecordingStreamController {
  constructor(private readonly recordingRepository: PrismaRecordingRepository) {}

  @Get(':id')
  @UseGuards(AudioAccessGuard)
  async audio(@Param('id') id: string, @Req() request: Request, @Res() response: Response) {
    const ownerId = (request as RequestWithAudioUser).audioUserId
    // Ownership is re-checked against the recording even though the token names
    // it: a capability is not a substitute for the rule that answers
    // RECORDING_NOT_FOUND for someone else's audio.
    const recording = await new RecordingFacade(undefined, this.recordingRepository).getRecording(
      id,
      ownerId,
    )

    await streamAudioFile(request, response, {
      path: resolveUploadPath(recording.audioUrl),
      mimeType: recording.mimeType,
    })
  }
}
