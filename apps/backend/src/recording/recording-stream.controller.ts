import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { RecordingFacade } from '@recording/adapters'
import { resolveUploadPath } from '../upload/uploads.config'
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
 * moment.
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
    const path = resolveUploadPath(recording.audioUrl)
    const { size } = await stat(path)

    response.setHeader('Content-Type', recording.mimeType)
    // Without this the browser never even TRIES a range request.
    response.setHeader('Accept-Ranges', 'bytes')
    // The bytes are private: no shared cache may keep a copy.
    response.setHeader('Cache-Control', 'private, max-age=0, no-store')

    const range = parseRange(request.headers.range, size)

    if (range === 'invalid') {
      response.status(416).setHeader('Content-Range', `bytes */${size}`)
      response.end()
      return
    }

    if (!range) {
      response.setHeader('Content-Length', size)
      createReadStream(path).pipe(response)
      return
    }

    response.status(206)
    response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
    response.setHeader('Content-Length', range.end - range.start + 1)
    createReadStream(path, { start: range.start, end: range.end }).pipe(response)
  }
}

/**
 * `bytes=start-end`, the only form browsers send for media. A missing end means
 * "to the last byte"; a missing start (`bytes=-500`) means the last N bytes,
 * which is what a player asks for when it goes looking for a container's index
 * at the end of the file.
 */
function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | 'invalid' {
  if (!header) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return 'invalid'

  const [, rawStart, rawEnd] = match
  if (!rawStart && !rawEnd) return 'invalid'

  const start = rawStart ? Number(rawStart) : Math.max(size - Number(rawEnd), 0)
  const end = rawStart ? Math.min(rawEnd ? Number(rawEnd) : size - 1, size - 1) : size - 1

  if (start > end || start >= size) return 'invalid'
  return { start, end }
}
