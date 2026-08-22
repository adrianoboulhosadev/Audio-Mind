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
import { stat, unlink } from 'fs/promises'
import { RecordingDTO, RecordingFacade, RenameRecordingInput, UploadRecordingInput } from '@recording/adapters'
import { SummaryFacade } from '@summary/adapters'
import { TranscriptionFacade } from '@transcription/adapters'
import { UserDTO } from '@auth/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { requireFields } from '../shared/require-fields'
import { DomainEventListener } from '../notification/domain-event-listener'
import { PrismaSummaryRepository } from '../summary/prisma-summary-repository'
import { PrismaTranscriptionRepository } from '../transcription/prisma-transcription-repository'
import { normalizeMimeType, resolveUploadPath } from '../upload/uploads.config'
import { BullMqRecordingProcessingQueue } from './bullmq-recording-processing-queue'
import { PrismaRecordingRepository } from './prisma-recording-repository'

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
    private readonly transcriptionRepository: PrismaTranscriptionRepository,
    private readonly summaryRepository: PrismaSummaryRepository,
    private readonly queue: BullMqRecordingProcessingQueue,
    private readonly events: DomainEventListener,
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

    await this.facade().uploadRecording(user.id, {
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
   * Deleting is CROSS-CONTEXT, so the orchestration lives here (the app layer),
   * exactly like every other cross-context flow: the recording owns none of the
   * derived rows, and none of those contexts knows who owns a recording.
   *
   * Order matters — the recording is read FIRST (which is also the ownership
   * check) because its row is what says where the files are.
   */
  @Delete(':id')
  async remove(@authenticatedUser() user: UserDTO, @Param('id') id: string) {
    const recording = await this.facade().getRecording(id, user.id)
    const summary = await new SummaryFacade(undefined, this.summaryRepository)
      .getSummary(id)
      .catch(() => null)

    await new TranscriptionFacade(this.transcriptionRepository).deleteTranscription(id)
    await new SummaryFacade(this.summaryRepository).deleteSummary(id)
    await this.facade().deleteRecording(id, user.id)

    // The files go last and best-effort: the rows are gone either way, and a
    // leftover file is a janitorial problem, not a broken delete the user has
    // to see as an error.
    await this.removeFile(recording.audioUrl)
    if (summary?.pdfUrl) await this.removeFile(summary.pdfUrl)
  }

  /**
   * Streams the audio to its owner.
   *
   * The uploads folder is NOT served statically: an audio (and its summary) is
   * private, and a static mount would make every file readable by anyone who
   * learned its URL. The cost is that the browser cannot simply point <audio>
   * at it — no way to send the Authorization header — so the front fetches it
   * as a blob and plays an object URL. Fine at a 25 MB ceiling.
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

  private async removeFile(url: string): Promise<void> {
    try {
      await unlink(resolveUploadPath(url))
    } catch {
      // Already gone (or never written): nothing to clean up.
    }
  }
}
