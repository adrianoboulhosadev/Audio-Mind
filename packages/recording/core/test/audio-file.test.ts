import { Errors } from 'shared'
import { AudioFile } from '../src'

const VALID = {
  url: '/uploads/audios/abc.mp3',
  mimeType: 'audio/mpeg',
  sizeBytes: 2_000_000,
  durationSeconds: 300,
}

test('accepts a supported file and rounds the duration to whole seconds', () => {
  const audio = new AudioFile({ ...VALID, durationSeconds: 300.4 })
  expect(audio.durationSeconds).toBe(300)
  expect(audio.megabytes).toBe(1.91)
})

test('normalizes the mime type before matching it', () => {
  expect(new AudioFile({ ...VALID, mimeType: ' AUDIO/WEBM ' }).mimeType).toBe('audio/webm')
})

test('rejects a format the transcription model does not accept', () => {
  expect(() => new AudioFile({ ...VALID, mimeType: 'application/pdf' })).toThrow(
    expect.objectContaining({ code: Errors.UNSUPPORTED_AUDIO_FORMAT }),
  )
})

test('rejects an audio past the 25 MB ceiling', () => {
  expect(() => new AudioFile({ ...VALID, sizeBytes: AudioFile.MAX_SIZE_BYTES + 1 })).toThrow(
    expect.objectContaining({ code: Errors.AUDIO_TOO_LARGE }),
  )
})

test('rejects an audio past the 30 min ceiling', () => {
  expect(() => new AudioFile({ ...VALID, durationSeconds: AudioFile.MAX_DURATION_SECONDS + 1 })).toThrow(
    expect.objectContaining({ code: Errors.AUDIO_TOO_LONG }),
  )
})

test('a zero duration is the browser failing to read the metadata, not a short audio', () => {
  expect(() => new AudioFile({ ...VALID, durationSeconds: 0 })).toThrow(
    expect.objectContaining({ code: Errors.INVALID_AUDIO_DURATION }),
  )
})

test('rejects a missing file path', () => {
  expect(() => new AudioFile({ ...VALID, url: '  ' })).toThrow(
    expect.objectContaining({ code: Errors.AUDIO_FILE_REQUIRED }),
  )
})
