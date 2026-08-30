import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  AddAnnotationInput,
  AnnotationDTO,
  AnnotationFacade,
  EditAnnotationNoteInput,
} from '@annotation/adapters'
import { RecordingFacade } from '@recording/adapters'
import { UserDTO } from '@auth/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { requireFields } from '../shared/require-fields'
import { PrismaRecordingRepository } from '../recording/prisma-recording-repository'
import { PrismaAnnotationRepository } from './prisma-annotation-repository'

/**
 * One line of the library-wide marks screen: the mark, and which audio it points
 * into. Composed HERE because it spans two contexts — same shape as the tasks
 * screen, and for the same reason.
 */
export interface AnnotationItem {
  annotation: AnnotationDTO
  recordingTitle: string
}

/**
 * Marks and notes anchored to a second of a recording.
 *
 * The recording is read FIRST wherever one is named, which is what answers
 * RECORDING_NOT_FOUND for someone else's audio: the annotation context knows
 * nothing about who owns a recording.
 */
@Controller('annotation')
export class AnnotationController {
  constructor(
    private readonly repository: PrismaAnnotationRepository,
    private readonly recordingRepository: PrismaRecordingRepository,
  ) {}

  private facade(): AnnotationFacade {
    return new AnnotationFacade(this.repository, this.repository)
  }

  private recordings(): RecordingFacade {
    return new RecordingFacade(undefined, this.recordingRepository)
  }

  @Post('recording/:recordingId')
  @HttpCode(201)
  async add(
    @authenticatedUser() user: UserDTO,
    @Param('recordingId') recordingId: string,
    @Body() input: AddAnnotationInput,
  ) {
    requireFields(input, ['atSeconds'])
    await this.recordings().getRecording(recordingId, user.id)

    // Answers nothing (CQRS): the panel re-reads the recording's marks, where
    // the new one lands in its place on the timeline.
    await this.facade().addAnnotation(user.id, recordingId, input)
  }

  @Get('recording/:recordingId')
  async listForRecording(
    @authenticatedUser() user: UserDTO,
    @Param('recordingId') recordingId: string,
  ): Promise<AnnotationDTO[]> {
    await this.recordings().getRecording(recordingId, user.id)
    return this.facade().listRecordingAnnotations(recordingId)
  }

  /** Every mark in the library, each saying which audio it points into. */
  @Get()
  async listMine(
    @authenticatedUser() user: UserDTO,
    @Query('limit') limit?: string,
  ): Promise<AnnotationItem[]> {
    const annotations = await this.facade().listMyAnnotations(
      user.id,
      limit ? Number(limit) : undefined,
    )

    const recordings = await this.recordings().listRecordingsByIds(
      user.id,
      annotations.map((annotation) => annotation.recordingId),
    )
    const titles = new Map(recordings.map((recording) => [recording.id, recording.title]))

    // A mark whose recording is gone is dropped rather than shown pointing at
    // nothing — the cascade takes marks with the audio, so this can only be a
    // row that outlived it.
    return annotations
      .filter((annotation) => titles.has(annotation.recordingId))
      .map((annotation) => ({
        annotation,
        recordingTitle: titles.get(annotation.recordingId)!,
      }))
  }

  @Patch(':id')
  async editNote(
    @authenticatedUser() user: UserDTO,
    @Param('id') id: string,
    @Body() input: EditAnnotationNoteInput,
  ) {
    await this.facade().editAnnotationNote(id, user.id, input?.note)
  }

  @Delete(':id')
  async remove(@authenticatedUser() user: UserDTO, @Param('id') id: string) {
    await this.facade().deleteAnnotation(id, user.id)
  }
}
