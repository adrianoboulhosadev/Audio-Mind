import { Injectable } from '@nestjs/common'
import { unlink } from 'fs/promises'
import { RecordingFacade } from '@recording/adapters'
import { SummaryFacade } from '@summary/adapters'
import { TranscriptionFacade } from '@transcription/adapters'
import { resolveUploadPath } from '../upload/uploads.config'
import { PrismaSummaryRepository } from '../summary/prisma-summary-repository'
import { PrismaTranscriptionRepository } from '../transcription/prisma-transcription-repository'
import { PrismaRecordingRepository } from './prisma-recording-repository'

/** What the read side returns in one query, at most (see ListMyRecordingsQuery). */
const PAGE_SIZE = 100

/**
 * Deleting a recording is CROSS-CONTEXT, so the orchestration lives in the app
 * layer — the recording owns none of the derived rows, and none of those
 * contexts knows who owns a recording.
 *
 * It sits in its own class instead of inside the controller because two screens
 * need the exact same cascade in the exact same order: "delete this audio" and
 * "delete my account, and with it everything I ever recorded". A second copy of
 * the order is a second chance to forget the PDF on disk.
 */
@Injectable()
export class RecordingEraser {
  constructor(
    private readonly recordingRepository: PrismaRecordingRepository,
    private readonly transcriptionRepository: PrismaTranscriptionRepository,
    private readonly summaryRepository: PrismaSummaryRepository,
  ) {}

  /**
   * One recording and everything derived from it. The recording is read FIRST —
   * which is also the ownership check — because its row is what says where the
   * audio file is.
   */
  async erase(recordingId: string, ownerId: string): Promise<void> {
    const recordings = this.recordings()
    const recording = await recordings.getRecording(recordingId, ownerId)
    const summary = await new SummaryFacade(undefined, this.summaryRepository)
      .getSummary(recordingId)
      .catch(() => null)

    await new TranscriptionFacade(this.transcriptionRepository).deleteTranscription(recordingId)
    await new SummaryFacade(this.summaryRepository).deleteSummary(recordingId)
    await recordings.deleteRecording(recordingId, ownerId)

    // The files go last and best-effort: the rows are gone either way, and a
    // leftover file is a janitorial problem, not a broken delete the user has
    // to see as an error.
    await this.removeFile(recording.audioUrl)
    if (summary?.pdfUrl) await this.removeFile(summary.pdfUrl)
  }

  /**
   * The owner's whole library, page by page. The read side caps how many rows a
   * single query may return, so this asks again after each pass instead of
   * inventing an uncapped listing port — every pass deletes what it read, so the
   * next one comes back shorter and the loop ends at an empty page.
   */
  async eraseAllOwnedBy(ownerId: string): Promise<void> {
    const recordings = this.recordings()

    let page = await recordings.listMyRecordings(ownerId, PAGE_SIZE)
    while (page.length > 0) {
      for (const recording of page) {
        await this.erase(recording.id, ownerId)
      }
      page = await recordings.listMyRecordings(ownerId, PAGE_SIZE)
    }
  }

  private recordings(): RecordingFacade {
    return new RecordingFacade(this.recordingRepository, this.recordingRepository)
  }

  private async removeFile(url: string): Promise<void> {
    try {
      await unlink(resolveUploadPath(url))
    } catch {
      // Already gone (or never written): nothing to clean up.
    }
  }
}

