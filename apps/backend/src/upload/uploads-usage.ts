import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { AUDIO_SUBDIR, SUMMARY_SUBDIR, UPLOADS_DIR } from './uploads.config'

export interface UploadsUsage {
  audios: { files: number; bytes: number }
  summaries: { files: number; bytes: number }
  totalBytes: number
}

/**
 * What is actually ON DISK under the uploads root.
 *
 * Measured by walking the folder rather than adding up the rows, and that is the
 * point: the rows say what the app THINKS it stored, and the difference between
 * the two numbers is exactly what the janitor exists to clean up. An
 * administrator looking at a disk that is fuller than the library wants to see
 * both figures, not one of them.
 *
 * Best-effort: a folder that cannot be read counts as empty instead of failing
 * the whole screen — this is a diagnostic, and a missing number is better than
 * no page.
 */
export async function measureUploads(): Promise<UploadsUsage> {
  const [audios, summaries] = await Promise.all([
    measureFolder(join(UPLOADS_DIR, AUDIO_SUBDIR)),
    measureFolder(join(UPLOADS_DIR, SUMMARY_SUBDIR)),
  ])

  return { audios, summaries, totalBytes: audios.bytes + summaries.bytes }
}

async function measureFolder(path: string): Promise<{ files: number; bytes: number }> {
  try {
    const names = await readdir(path)
    let bytes = 0
    let files = 0

    for (const name of names) {
      try {
        const info = await stat(join(path, name))
        if (!info.isFile()) continue
        files += 1
        bytes += info.size
      } catch {
        // Deleted between the listing and the stat: it is not there any more.
      }
    }

    return { files, bytes }
  } catch {
    return { files: 0, bytes: 0 }
  }
}
