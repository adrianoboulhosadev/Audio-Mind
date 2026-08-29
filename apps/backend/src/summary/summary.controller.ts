import { Body, Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common'
import { Response } from 'express'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { AskedAnswerDTO, SummaryDTO, SummaryFacade } from '@summary/adapters'
import { RecordingFacade } from '@recording/adapters'
import { TranscriptionFacade } from '@transcription/adapters'
import { UserDTO } from '@auth/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { requireFields } from '../shared/require-fields'
import { PrismaRecordingRepository } from '../recording/prisma-recording-repository'
import { PrismaTranscriptionRepository } from '../transcription/prisma-transcription-repository'
import { resolveUploadPath } from '../upload/uploads.config'
import { GroqQuestionAnswerer } from './groq-question-answerer'
import { PrismaSummaryRepository } from './prisma-summary-repository'

/**
 * Reading the summary of a recording, and downloading its PDF.
 *
 * Ownership is resolved CROSS-CONTEXT against the recording first, exactly like
 * the transcript route next door — the summary context knows nothing about who
 * owns what.
 */
@Controller('summary')
export class SummaryController {
  constructor(
    private readonly recordingRepository: PrismaRecordingRepository,
    private readonly summaryRepository: PrismaSummaryRepository,
    // Asking a question reads the TRANSCRIPT and answers with a model — the
    // recording says who owns it, this context does the talking.
    private readonly transcriptionRepository: PrismaTranscriptionRepository,
    private readonly answerer: GroqQuestionAnswerer,
  ) {}

  private summaries(): SummaryFacade {
    return new SummaryFacade(undefined, this.summaryRepository)
  }

  private async assertOwner(recordingId: string, userId: string) {
    return new RecordingFacade(undefined, this.recordingRepository).getRecording(recordingId, userId)
  }

  @Get('recording/:id')
  async byRecording(
    @authenticatedUser() user: UserDTO,
    @Param('id') recordingId: string,
  ): Promise<SummaryDTO> {
    await this.assertOwner(recordingId, user.id)
    return this.summaries().getSummary(recordingId)
  }

  /**
   * Answers a question about ONE recording, from its transcript.
   *
   * Synchronous on purpose, unlike everything else that talks to a model here:
   * this is seconds, with the person waiting for it on screen — parking it in
   * the queue would mean answering a question through the inbox.
   *
   * Nothing is stored. The answer is a conversation about the audio, not a new
   * fact about it, and persisting it would raise the question of what happens
   * when the recording is reprocessed and the transcript changes underneath.
   */
  @Post('recording/:id/ask')
  @HttpCode(200)
  async ask(
    @authenticatedUser() user: UserDTO,
    @Param('id') recordingId: string,
    @Body() input: { question?: string },
  ): Promise<AskedAnswerDTO> {
    requireFields(input, ['question'])
    const recording = await this.assertOwner(recordingId, user.id)
    const transcription = await new TranscriptionFacade(
      undefined,
      this.transcriptionRepository,
    ).getTranscription(recordingId)

    return new SummaryFacade(undefined, undefined, undefined, undefined, this.answerer).askAboutTranscript({
      recordingTitle: recording.title,
      transcript: transcription.text,
      question: input.question!,
      language: process.env.SUMMARY_LANGUAGE ?? 'pt',
    })
  }

  /**
   * The PDF, streamed to its owner — the uploads folder is not served
   * statically (see RecordingController.audio for why). A summary whose PDF was
   * never rendered answers PDF_NOT_AVAILABLE, not "not found": the difference
   * tells the user their summary is fine and only the file is missing.
   */
  @Get('recording/:id/pdf')
  async pdf(
    @authenticatedUser() user: UserDTO,
    @Param('id') recordingId: string,
    @Res() response: Response,
  ) {
    const recording = await this.assertOwner(recordingId, user.id)
    const pdfUrl = await this.summaries().getSummaryPdf(recordingId)
    const path = resolveUploadPath(pdfUrl)
    const { size } = await stat(path)

    // The filename the browser saves under comes from the audio's title, so the
    // download is recognizable instead of a uuid.
    const filename = `${recording.title.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'resumo'}.pdf`
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Length', size)
    // TWO forms on purpose. `filename=` only carries ASCII, so a title like
    // "Reunião de kickoff" arrives mangled; `filename*=` (RFC 5987) carries the
    // real UTF-8 name. Every current browser prefers the starred one and older
    // clients fall back to the plain one, which is why both are sent.
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${toAsciiFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    )
    createReadStream(path).pipe(response)
  }
}

/**
 * The ASCII fallback of the same name: accents lose their diacritics rather than
 * turning into replacement characters, so a client that ignores `filename*=`
 * still saves something readable ("Reuniao de kickoff.pdf").
 */
function toAsciiFilename(filename: string): string {
  return (
    filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Anything still outside ASCII (and the quote that would end the header
      // value early) becomes a space; collapsing keeps the result tidy.
      .replace(/["\\]|[^\x20-\x7e]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'resumo.pdf'
  )
}
