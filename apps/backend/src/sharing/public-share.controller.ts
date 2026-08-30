import { Controller, Get, Param, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { Errors, NotFoundError } from 'shared'
import { RecordingFacade, RecordingKind } from '@recording/adapters'
import { ShareFacade } from '@sharing/adapters'
import { SummaryFacade } from '@summary/adapters'
import { TranscriptionFacade } from '@transcription/adapters'
import { streamAudioFile } from '../recording/audio-response'
import { PrismaRecordingRepository } from '../recording/prisma-recording-repository'
import { PrismaSummaryRepository } from '../summary/prisma-summary-repository'
import { PrismaTranscriptionRepository } from '../transcription/prisma-transcription-repository'
import { resolveUploadPath } from '../upload/uploads.config'
import { PrismaShareLinkRepository } from './prisma-share-link-repository'

/**
 * What a shared link hands over.
 *
 * Deliberately NOT the DTOs the private screens use: no owner, no user id, no
 * recording id, no model name. A visitor is not a user of this app — they were
 * sent one document — so the payload carries what that document needs and
 * nothing that would identify anybody or address anything else.
 */
export interface SharedDocument {
  recording: {
    title: string
    kind: RecordingKind
    durationSeconds: number
    createdAt: Date
  }
  summary: {
    headline: string
    overview: string
    topics: string[]
    actionItems: string[]
    createdAt: Date
  }
  /** Only when the owner opted in. */
  transcript: { text: string; segments: { startSeconds: number; text: string }[] } | null
  /** Only when the owner opted in — a URL back to this same controller. */
  audioUrl: string | null
  /** The visitor is told when the link dies: it is about to stop working, and
   * finding that out by it breaking is worse. */
  expiresAt: Date
}

/**
 * The PUBLIC side of sharing — the only route in this app that answers without a
 * session.
 *
 * Its own controller, OUTSIDE the AuthMiddleware (which is applied per class),
 * exactly like the audio stream and the SSE stream. The token in the path is the
 * whole authorization, and it names ONE recording: no listing, no other id, and
 * nothing here ever reads a caller's identity, because there is none.
 */
@Controller('share/public')
export class PublicShareController {
  constructor(
    private readonly repository: PrismaShareLinkRepository,
    private readonly recordingRepository: PrismaRecordingRepository,
    private readonly transcriptionRepository: PrismaTranscriptionRepository,
    private readonly summaryRepository: PrismaSummaryRepository,
  ) {}

  private shares(): ShareFacade {
    return new ShareFacade(this.repository, this.repository)
  }

  @Get(':token')
  async read(@Param('token') token: string): Promise<SharedDocument> {
    const { link, recording } = await this.resolve(token)

    // A summary that does not exist yet answers 404 with its own code, and the
    // page says "o resumo ainda não está pronto" — sharing an audio before the
    // pipeline finished is a real thing to do.
    const summary = await new SummaryFacade(undefined, this.summaryRepository).getSummary(
      link.recordingId,
    )

    const transcript = link.includesTranscript
      ? await new TranscriptionFacade(undefined, this.transcriptionRepository)
          .getTranscription(link.recordingId)
          .catch(() => null)
      : null

    // Counted after the read succeeded, and never allowed to break it: the
    // document was already produced, and failing to count a view is not a
    // reason to answer an error.
    await this.shares()
      .registerShareLinkView(token)
      .catch(() => undefined)

    return {
      recording: {
        title: recording.title,
        kind: recording.kind,
        durationSeconds: recording.durationSeconds,
        createdAt: recording.createdAt,
      },
      summary: {
        headline: summary.headline,
        overview: summary.overview,
        topics: summary.topics,
        actionItems: summary.actionItems,
        createdAt: summary.createdAt,
      },
      transcript: transcript
        ? {
            text: transcript.text,
            // Only the start and the words: the end of each stretch is for the
            // owner's player, and this page has no player to drive with it.
            segments: transcript.segments.map((segment) => ({
              startSeconds: segment.startSeconds,
              text: segment.text,
            })),
          }
        : null,
      audioUrl: link.includesAudio ? `/share/public/${token}/audio` : null,
      expiresAt: link.expiresAt,
    }
  }

  /**
   * The audio, when (and only when) the owner opted in. Same Range handling as
   * the owner's own stream — what differs is the authorization, which here is
   * the token itself.
   */
  @Get(':token/audio')
  async audio(@Param('token') token: string, @Req() request: Request, @Res() response: Response) {
    const { link, recording } = await this.resolve(token)
    if (!link.includesAudio) NotFoundError.throwError(Errors.SHARE_LINK_NOT_FOUND)

    await streamAudioFile(request, response, {
      path: resolveUploadPath(recording.audioUrl),
      mimeType: recording.mimeType,
    })
  }

  /**
   * Token -> the link and its recording, refusing anything unusable.
   *
   * The recording is read through the SYSTEM query (no owner), because there is
   * no authenticated caller here — and then its owner is checked against the
   * link's. That second check is what stops a link from outliving the ownership
   * it was created under.
   */
  private async resolve(token: string) {
    const link = await this.shares().getShareLinkByToken(token)
    const recording = await new RecordingFacade(
      undefined,
      this.recordingRepository,
    ).getRecordingForProcessing(link.recordingId)

    if (recording.ownerId !== link.ownerId) {
      NotFoundError.throwError(Errors.SHARE_LINK_NOT_FOUND)
    }

    return { link, recording }
  }
}
