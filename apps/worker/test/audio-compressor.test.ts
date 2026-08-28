import { execFileSync } from 'child_process'
import { existsSync, mkdtempSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { compressForTranscription } from '../src/extraction/audio-compressor'

/**
 * The re-encode is what makes a long recording fit under the transcription API's
 * 25 MB limit, so what is worth asserting is the BYTES — not that ffmpeg was
 * called with the right flags, which is just the implementation written twice.
 *
 * ffmpeg is a runtime dependency of the worker image, not of the test runner, so
 * the size assertions skip where it is missing. The fallback path below does not
 * skip: "no ffmpeg" is exactly the case it exists for.
 */
const HAS_FFMPEG = (() => {
  try {
    execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

const withFfmpeg = HAS_FFMPEG ? test : test.skip
const workDir = mkdtempSync(join(tmpdir(), 'audio-compressor-test-'))

/** Two minutes of 48 kHz stereo PCM — small enough for a test, and the exact
 * shape that wastes the byte budget on things the model discards. */
function makeWav(seconds: number): string {
  const path = join(workDir, `sample-${seconds}.wav`)
  execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `sine=frequency=300:duration=${seconds}:sample_rate=48000`,
    '-ac', '2', '-c:a', 'pcm_s16le', '-y', path,
  ])
  return path
}

withFfmpeg('shrinks a 48 kHz stereo wav by an order of magnitude', async () => {
  const source = makeWav(120)
  const audio = await compressForTranscription(source)

  try {
    expect(audio.compressed).toBe(true)
    expect(audio.originalBytes).toBe(statSync(source).size)
    // 48 kHz stereo PCM is ~192 kB/s; 16 kHz mono Opus at 32 kbps is ~4 kB/s.
    // Asserting "at least 10x" instead of an exact size keeps the test about the
    // point (it fits now) rather than about a codec's exact output.
    expect(audio.sentBytes).toBeLessThan(audio.originalBytes / 10)
  } finally {
    await audio.cleanup()
  }
})

withFfmpeg('cleanup removes the temporary file it created', async () => {
  const audio = await compressForTranscription(makeWav(5))
  const temporary = audio.path

  expect(existsSync(temporary)).toBe(true)
  await audio.cleanup()
  expect(existsSync(temporary)).toBe(false)
})

withFfmpeg('never sends MORE bytes than the original', async () => {
  // The whole job is fitting under a byte ceiling, so the one thing that must
  // hold for every input is that the re-encode did not make things worse. It
  // can: a short clip that is already 16 kHz mono Opus only gains container
  // overhead on a second pass, and then the original is the file to send.
  const alreadySmall = join(workDir, 'already-small.ogg')
  execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'sine=frequency=300:duration=3:sample_rate=16000',
    '-ac', '1', '-c:a', 'libopus', '-b:a', '24k', '-y', alreadySmall,
  ])

  for (const source of [alreadySmall, makeWav(10)]) {
    const audio = await compressForTranscription(source)
    try {
      expect(audio.sentBytes).toBeLessThanOrEqual(audio.originalBytes)
      // And whichever file it chose is a file that actually exists.
      expect(statSync(audio.path).size).toBe(audio.sentBytes)
    } finally {
      await audio.cleanup()
    }
  }
})

test('falls back to the original file when ffmpeg is not there at all', async () => {
  const source = join(workDir, 'untouched.mp3')
  writeFileSync(source, Buffer.alloc(2048, 1))

  const previous = process.env.FFMPEG_PATH
  process.env.FFMPEG_PATH = join(workDir, 'ffmpeg-that-does-not-exist')
  jest.resetModules()
  const { compressForTranscription: compress } = await import('../src/extraction/audio-compressor')

  try {
    const audio = await compress(source)
    // A worker that refused to transcribe a 2 MB recording because ffmpeg is
    // missing would trade a working pipeline for a problem that file does not have.
    expect(audio.path).toBe(source)
    expect(audio.compressed).toBe(false)
    expect(audio.sentBytes).toBe(2048)
    await audio.cleanup()
  } finally {
    process.env.FFMPEG_PATH = previous
  }
})

test('cleanup is safe to call when nothing was written', async () => {
  const source = join(workDir, 'noop.mp3')
  writeFileSync(source, Buffer.alloc(64, 1))
  const audio = await compressForTranscription(source)
  await expect(audio.cleanup()).resolves.toBeUndefined()
})
