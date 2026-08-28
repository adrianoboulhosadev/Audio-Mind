import { Errors } from 'shared'
import { AudioFile } from '../src'

const STANDARD = AudioFile.ALLOWANCES.standard
const EXTENDED = AudioFile.ALLOWANCES.extended

const VALID = {
  url: '/uploads/audios/abc.mp3',
  mimeType: 'audio/mpeg',
  sizeBytes: 2_000_000,
  durationSeconds: 300,
  admissionLimits: STANDARD,
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

test('rejects an audio past the standard 25 MB ceiling', () => {
  expect(() => new AudioFile({ ...VALID, sizeBytes: STANDARD.maxSizeBytes + 1 })).toThrow(
    expect.objectContaining({ code: Errors.AUDIO_TOO_LARGE }),
  )
})

test('rejects an audio past the standard 30 min ceiling', () => {
  expect(() => new AudioFile({ ...VALID, durationSeconds: STANDARD.maxDurationSeconds! + 1 })).toThrow(
    expect.objectContaining({ code: Errors.AUDIO_TOO_LONG }),
  )
})

test('the extended allowance accepts what the standard one refuses', () => {
  const big = {
    ...VALID,
    sizeBytes: 900 * 1024 * 1024,
    durationSeconds: 6 * 60 * 60,
    admissionLimits: EXTENDED,
  }
  expect(new AudioFile(big).sizeBytes).toBe(900 * 1024 * 1024)
})

test('the extended allowance still has a size ceiling', () => {
  expect(
    () =>
      new AudioFile({
        ...VALID,
        sizeBytes: EXTENDED.maxSizeBytes + 1,
        admissionLimits: EXTENDED,
      }),
  ).toThrow(expect.objectContaining({ code: Errors.AUDIO_TOO_LARGE }))
})

test('a zero duration is refused under EVERY allowance — that is broken metadata', () => {
  for (const admissionLimits of [STANDARD, EXTENDED]) {
    expect(() => new AudioFile({ ...VALID, durationSeconds: 0, admissionLimits })).toThrow(
      expect.objectContaining({ code: Errors.INVALID_AUDIO_DURATION }),
    )
  }
})

test('limitsFor is fail-closed: an unknown or missing allowance gets the tight one', () => {
  expect(AudioFile.limitsFor()).toEqual(STANDARD)
  expect(AudioFile.limitsFor(null)).toEqual(STANDARD)
  expect(AudioFile.limitsFor('extended')).toEqual(EXTENDED)
})

// The ceilings are an ADMISSION rule, not an invariant of a stored recording:
// re-checking them would make an admin's old 900 MB row unloadable the day
// someone narrows the allowance.
test('reconstitution without limits keeps an already-admitted audio loadable', () => {
  const stored = new AudioFile({
    url: VALID.url,
    mimeType: VALID.mimeType,
    sizeBytes: 900 * 1024 * 1024,
    durationSeconds: 6 * 60 * 60,
  })
  expect(stored.sizeBytes).toBe(900 * 1024 * 1024)
})

test('rejects a missing file path', () => {
  expect(() => new AudioFile({ ...VALID, url: '  ' })).toThrow(
    expect.objectContaining({ code: Errors.AUDIO_FILE_REQUIRED }),
  )
})
