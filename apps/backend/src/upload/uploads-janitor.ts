import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { readdir, stat, unlink } from 'fs/promises'
import { basename, join } from 'path'
import { PrismaService } from '../db/prisma.service'
import { AUDIO_SUBDIR, SUMMARY_SUBDIR, UPLOADS_DIR } from './uploads.config'

/** How often the sweep runs. Orphans are rare and cost only disk, so this is a
 * chore, not a duty. */
const EVERY_MS = 12 * 60 * 60 * 1000

/** A minute-old file is not an orphan, it is an upload in progress. A DAY is
 * deliberately far past any window where a file could still be on its way to a
 * row — deleting someone's audio because a request was slow is a much worse
 * outcome than a file that lingers. */
const MIN_AGE_MS = 24 * 60 * 60 * 1000

/** Runs a while after boot: starting up is busy enough without a disk sweep. */
const FIRST_RUN_DELAY_MS = 60_000

/**
 * Deletes files under the uploads root that no row points at.
 *
 * They exist because the upload is TWO requests by design: the bytes go up and
 * answer with a path, and only then is the recording created from that path. A
 * person who closes the tab in between leaves a file nobody will ever ask for —
 * and nothing else in the app is ever going to notice it.
 *
 * Conservative on purpose, in this order: only files older than a day, only
 * those absent from the database, and every deletion logged. Getting this wrong
 * means erasing an audio someone recorded, so the sweep would rather leave
 * garbage behind than take a chance.
 */
@Injectable()
export class UploadsJanitor implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null
  private firstRun: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    this.firstRun = setTimeout(() => void this.sweep(), FIRST_RUN_DELAY_MS)
    this.timer = setInterval(() => void this.sweep(), EVERY_MS)
    // Neither timer is a reason to keep the process alive.
    this.firstRun.unref?.()
    this.timer.unref?.()
  }

  onModuleDestroy(): void {
    if (this.firstRun) clearTimeout(this.firstRun)
    if (this.timer) clearInterval(this.timer)
  }

  async sweep(): Promise<void> {
    try {
      const [recordings, summaries] = await Promise.all([
        this.prisma.recording.findMany({ select: { audioUrl: true } }),
        this.prisma.summary.findMany({ select: { pdfUrl: true } }),
      ])

      await this.sweepFolder(
        AUDIO_SUBDIR,
        new Set(recordings.map((row) => basename(row.audioUrl))),
      )
      await this.sweepFolder(
        SUMMARY_SUBDIR,
        new Set(summaries.flatMap((row) => (row.pdfUrl ? [basename(row.pdfUrl)] : []))),
      )
    } catch (error) {
      // A janitor that throws must not take anything down with it.
      console.error('[uploads] sweep failed:', error)
    }
  }

  private async sweepFolder(subdir: string, referenced: Set<string>): Promise<void> {
    const folder = join(UPLOADS_DIR, subdir)
    const files = await readdir(folder).catch(() => [] as string[])
    const now = Date.now()

    for (const file of files) {
      if (referenced.has(file)) continue

      const path = join(folder, file)
      const info = await stat(path).catch(() => null)
      if (!info?.isFile() || now - info.mtimeMs < MIN_AGE_MS) continue

      // Logged, always: this is the app deleting a file nobody asked it to,
      // and the only way to answer "where did it go" later is to have said so.
      await unlink(path)
        .then(() => console.log(`[uploads] removed orphan ${subdir}/${file}`))
        .catch((error) => console.error(`[uploads] could not remove ${subdir}/${file}:`, error))
    }
  }
}
