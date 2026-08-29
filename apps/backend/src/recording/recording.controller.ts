import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import { Response } from 'express'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { RecordingDTO, RecordingFacade, RenameRecordingInput, UploadRecordingInput } from '@recording/adapters'
import { UserDTO } from '@auth/adapters'
import { allowanceFor } from '../auth/upload-allowance'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { requireFields } from '../shared/require-fields'
import { DomainEventListener } from '../notification/domain-event-listener'
import { normalizeMimeType, resolveUploadPath } from '../upload/uploads.config'
import { signAudioAccess } from './audio-access-token'
import { BullMqRecordingProcessingQueue } from './bullmq-recording-processing-queue'
import { PrismaRecordingRepository } from './prisma-recording-repository'
import { RecordingEraser } from './recording-eraser'

/**
 * The user's library. Every route takes the owner id from `@authenticatedUser`
 * (never from the body or the path), and the use cases answer
 * RECORDING_NOT_FOUND for someone else's audio — a recording is private, so
 * confirming that an id exists would already leak something.
 */
@Controller('recording')
export class RecordingController {
  constructor(
    private readonly recordingRepository: PrismaRecordingRepository,
    private readonly queue: BullMqRecordingProcessingQueue,
    private readonly events: DomainEventListener,
    private readonly eraser: RecordingEraser,
  ) {}

  private facade(): RecordingFacade {
    return new RecordingFacade(
      this.recordingRepository,
      this.recordingRepository,
      this.queue,
      this.events,
    )
  }

  @Post()
  async upload(@authenticatedUser() user: UserDTO, @Body() input: UploadRecordingInput) {
    requireFields(input, ['title', 'audioUrl', 'mimeType', 'sizeBytes', 'durationSeconds'])
    // The path arrives in the BODY (the client uploaded the bytes first), so it
    // is checked against the uploads root before anything stores it.
    resolveUploadPath(input.audioUrl)

    // The allowance is read from the authenticated caller, never from the body:
    // a client that could name its own ceiling would name the biggest one.
    await this.facade().uploadRecording(user.id, allowanceFor(user), {
      ...input,
      source: input.source === 'record' ? 'record' : 'upload',
      mimeType: normalizeMimeType(input.mimeType),
    })
  }

  @Get()
  async list(
    @authenticatedUser() user: UserDTO,
    @Query('limit') limit?: string,
  ): Promise<RecordingDTO[]> {
    return this.facade().listMyRecordings(user.id, limit ? Number(limit) : undefined)
  }

  @Get(':id')
  async find(@authenticatedUser() user: UserDTO, @Param('id') id: string): Promise<RecordingDTO> {
    return this.facade().getRecording(id, user.id)
  }

  @Patch(':id')
  async rename(
    @authenticatedUser() user: UserDTO,
    @Param('id') id: string,
    @Body() input: RenameRecordingInput,
  ) {
    requireFields(input, ['title'])
    await this.facade().renameRecording(id, user.id, input)
  }

  @Post(':id/retry')
  @HttpCode(200)
  async retry(@authenticatedUser() user: UserDTO, @Param('id') id: string) {
    await this.facade().retryRecording(id, user.id)
  }

  /**
   * Deleting is CROSS-CONTEXT (transcript, summary, the files on disk), and the
   * ordered cascade lives in the RecordingEraser — the same one the account
   * erasure runs over the whole library.
   */
  @Delete(':id')
  async remove(@authenticatedUser() user: UserDTO, @Param('id') id: string) {
    await this.eraser.erase(id, user.id)
  }

  /**
   * Hands out a short-lived link the browser's `<audio>` element can load by
   * itself — which is what makes playback start immediately and seeking fetch
   * only the bytes around the moment asked for (see RecordingStreamController).
   *
   * The recording is read first, so a link is only ever issued for an audio the
   * caller owns.
   */
  @Get(':id/audio/link')
  async audioLink(
    @authenticatedUser() user: UserDTO,
    @Param('id') id: string,
  ): Promise<{ url: string }> {
    await this.facade().getRecording(id, user.id)
    return { url: `/recording/stream/${id}?token=${signAudioAccess(user.id, id)}` }
  }

  /**
   * Streams the whole audio to its owner, in one piece.
   *
   * The uploads folder is NOT served statically: an audio (and its summary) is
   * private, and a static mount would make every file readable by anyone who
   * learned its URL.
   *
   * This is the header-authenticated route, and it is still the one the front
   * uses for a WebM recorded in the browser: that container carries neither a
   * duration nor a seek index, so a player CANNOT seek it by range — it needs
   * the whole file. Everything else plays through the streaming route.
   */
  @Get(':id/audio')
  async audio(
    @authenticatedUser() user: UserDTO,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const recording = await this.facade().getRecording(id, user.id)
    const path = resolveUploadPath(recording.audioUrl)
    const { size } = await stat(path)

    response.setHeader('Content-Type', recording.mimeType)
    response.setHeader('Content-Length', size)
    createReadStream(path).pipe(response)
  }
}
