import { spawn } from 'child_process'
import { stat, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

/**
 * The transcription API refuses a file over 25 MB, and that ceiling is about
 * BYTES, not about minutes. A 40-minute meeting recorded as 48 kHz stereo WAV is
 * hundreds of megabytes of information the model throws away anyway: Whisper
 * resamples everything to 16 kHz mono before it listens.
 *
 * So the audio is re-encoded before it is sent — 16 kHz, mono, Opus at 32 kbps,
 * which is roughly 4 kB per second of speech. That turns the practical ceiling
 * from "half an hour, if the format is kind" into a couple of hours, without
 * touching what the model actually hears.
 *
 * Opus and not FLAC: FLAC is lossless, so a 16 kHz mono stream still costs ~18
 * kB/s and 25 MB buys barely more than the old limit. Lossy is the whole point
 * here, and speech at 32 kbps is well inside what ASR handles.
 */
export const TRANSCRIPTION_SIZE_LIMIT_BYTES = 25 * 1024 * 1024

/** Overridable because a container installs ffmpeg on PATH while a dev machine
 * may have it somewhere else entirely. */
const FFMPEG_PATH = process.env.FFMPEG_PATH ?? 'ffmpeg'

export interface CompressedAudio {
  /** What to actually send. May be the original file when no re-encode helped. */
  path: string
  /** Removes the temporary file, if one was written. Always safe to call. */
  cleanup: () => Promise<void>
  originalBytes: number
  sentBytes: number
  compressed: boolean
}

/**
 * Prepares an audio file for the transcription API.
 *
 * Never throws on a failed re-encode: ffmpeg missing, or a container it cannot
 * read, falls back to the original file. A worker that refuses to transcribe a
 * 2 MB recording because ffmpeg is not installed would be trading a working
 * pipeline for a size problem that recording does not have. Whether what comes
 * out is small ENOUGH is the caller's decision, not this function's.
 */
export async function compressForTranscription(audioPath: string): Promise<CompressedAudio> {
  const { size: originalBytes } = await stat(audioPath)
  const noop: CompressedAudio = {
    path: audioPath,
    cleanup: async () => {},
    originalBytes,
    sentBytes: originalBytes,
    compressed: false,
  }

  const target = join(tmpdir(), `audio-mind-${randomUUID()}.ogg`)
  try {
    await runFfmpeg(audioPath, target)
    const { size: sentBytes } = await stat(target)

    // Re-encoding an already-small mp3 can come out BIGGER. Keep whichever file
    // is smaller — the only thing that matters here is the byte count.
    if (sentBytes >= originalBytes) {
      await removeQuietly(target)
      return noop
    }

    return {
      path: target,
      cleanup: () => removeQuietly(target),
      originalBytes,
      sentBytes,
      compressed: true,
    }
  } catch (error) {
    console.warn(
      `[worker] could not re-encode ${audioPath}, sending it as it is:`,
      error instanceof Error ? error.message : error,
    )
    await removeQuietly(target)
    return noop
  }
}

function runFfmpeg(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(
      FFMPEG_PATH,
      [
        '-hide_banner',
        '-loglevel', 'error',
        '-nostdin',
        '-i', input,
        // Everything Whisper cares about, and nothing else: one channel, 16 kHz.
        '-ac', '1',
        '-ar', '16000',
        '-c:a', 'libopus',
        '-b:a', '32k',
        // `-y` because the target is a uuid we just made up — there is nothing
        // to overwrite, and without it ffmpeg would sit waiting for an answer.
        '-y', output,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )

    let stderr = ''
    process.stderr?.on('data', (chunk) => {
      // Bounded: a broken file can make ffmpeg complain forever, and this string
      // only exists to end up in one log line.
      if (stderr.length < 2000) stderr += String(chunk)
    })

    process.on('error', reject)
    process.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}: ${stderr.trim()}`)),
    )
  })
}

async function removeQuietly(path: string): Promise<void> {
  await unlink(path).catch(() => {})
}
