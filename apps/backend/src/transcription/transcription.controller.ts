import { Controller, Get, Param } from '@nestjs/common'
import { TranscriptionDTO, TranscriptionFacade } from '@transcription/adapters'
import { RecordingFacade } from '@recording/adapters'
import { UserDTO } from '@auth/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { PrismaRecordingRepository } from '../recording/prisma-recording-repository'
import { PrismaTranscriptionRepository } from './prisma-transcription-repository'

/**
 * Reading the transcript of a recording.
 *
 * OWNERSHIP IS RESOLVED CROSS-CONTEXT, here in the app layer: the transcription
 * context knows nothing about who owns a recording, so the recording is read
 * FIRST (which throws RECORDING_NOT_FOUND for a stranger) and only then the
 * transcript. Same shape every cross-context read in this project uses.
 */
@Controller('transcription')
export class TranscriptionController {
  constructor(
    private readonly recordingRepository: PrismaRecordingRepository,
    private readonly transcriptionRepository: PrismaTranscriptionRepository,
  ) {}

  @Get('recording/:id')
  async byRecording(
    @authenticatedUser() user: UserDTO,
    @Param('id') recordingId: string,
  ): Promise<TranscriptionDTO> {
    await new RecordingFacade(undefined, this.recordingRepository).getRecording(recordingId, user.id)

    return new TranscriptionFacade(undefined, this.transcriptionRepository).getTranscription(
      recordingId,
    )
  }
}
