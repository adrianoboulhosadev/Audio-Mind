import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common'
import { RecordingFacade } from '@recording/adapters'
import { CreateShareLinkInput, ShareFacade, ShareLinkDTO } from '@sharing/adapters'
import { UserDTO } from '@auth/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { PrismaRecordingRepository } from '../recording/prisma-recording-repository'
import { PrismaShareLinkRepository } from './prisma-share-link-repository'

/**
 * The OWNER's side of sharing: hand out a link, see what is out there, cut one
 * off.
 *
 * The recording is read FIRST on creation, which is what answers
 * RECORDING_NOT_FOUND for someone else's audio — the sharing context knows
 * nothing about who owns a recording, exactly like the transcript and the
 * summary contexts.
 */
@Controller('share')
export class ShareController {
  constructor(
    private readonly repository: PrismaShareLinkRepository,
    private readonly recordingRepository: PrismaRecordingRepository,
  ) {}

  private facade(): ShareFacade {
    return new ShareFacade(this.repository, this.repository)
  }

  @Post('recording/:recordingId')
  @HttpCode(201)
  async create(
    @authenticatedUser() user: UserDTO,
    @Param('recordingId') recordingId: string,
    @Body() input: CreateShareLinkInput,
  ) {
    // Ownership check, and the reason this route lives in the app layer.
    await new RecordingFacade(undefined, this.recordingRepository).getRecording(
      recordingId,
      user.id,
    )

    // Answers nothing (CQRS): the screen re-reads the list below, where the new
    // link is the first row with its copy button.
    await this.facade().createShareLink(user.id, recordingId, {
      window: input?.window,
      includesTranscript: input?.includesTranscript === true,
      includesAudio: input?.includesAudio === true,
    })
  }

  @Get()
  async list(
    @authenticatedUser() user: UserDTO,
    @Query('recordingId') recordingId?: string,
  ): Promise<ShareLinkDTO[]> {
    return this.facade().listMyShareLinks(user.id, recordingId || undefined)
  }

  @Delete(':id')
  async revoke(@authenticatedUser() user: UserDTO, @Param('id') id: string) {
    await this.facade().revokeShareLink(id, user.id)
  }
}
