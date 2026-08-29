import { Errors } from 'shared'
import { Transcription, TranscriptSegment } from '../src'

test('keeps the moment each stretch was said', () => {
  const segment = new TranscriptSegment({ start: 12.5, end: 18, text: '  bom dia a todos  ' })

  expect(segment.startSeconds).toBe(12.5)
  expect(segment.endSeconds).toBe(18)
  expect(segment.text).toBe('bom dia a todos')
})

test('refuses a segment that ends before it starts', () => {
  expect(() => new TranscriptSegment({ start: 30, end: 10, text: 'oi' })).toThrow()
  expect(() => new TranscriptSegment({ start: -1, end: 10, text: 'oi' })).toThrow()
})

test('parse returns null instead of throwing — a crooked entry is not an exception', () => {
  expect(TranscriptSegment.parse({ start: 5, end: 1, text: 'oi' })).toBeNull()
  expect(TranscriptSegment.parse({ start: 0, end: 1, text: '   ' })).toBeNull()
  expect(TranscriptSegment.parse(undefined)).toBeNull()
  expect(TranscriptSegment.parse({ start: 0, end: 1, text: 'oi' })).not.toBeNull()
})

test('the entity DROPS the bad segments and keeps the transcript', () => {
  const transcription = new Transcription({
    recordingId: 'rec-1',
    text: 'bom dia a todos',
    model: 'whisper-large-v3',
    segments: [
      { start: 0, end: 2, text: 'bom dia' },
      { start: 9, end: 3, text: 'invertido' },
      { start: 2, end: 4, text: 'a todos' },
    ],
  })

  expect(transcription.segments).toHaveLength(2)
  expect(transcription.segments.map((segment) => segment.text)).toEqual(['bom dia', 'a todos'])
})

test('a transcript with no segments is still a transcript', () => {
  const transcription = new Transcription({
    recordingId: 'rec-1',
    text: 'bom dia',
    model: 'whisper-large-v3',
  })

  expect(transcription.segments).toEqual([])
  expect(transcription.text.value).toBe('bom dia')
})

test('a segment longer than a segment could be is refused', () => {
  expect(
    TranscriptSegment.parse({
      start: 0,
      end: 1,
      text: 'a'.repeat(TranscriptSegment.MAX_TEXT_LENGTH + 1),
    }),
  ).toBeNull()
})

test('the invalid-segment code is its own — it is never confused with an empty transcript', () => {
  expect(() => new TranscriptSegment({ start: 0, end: 1, text: '' })).toThrow(
    expect.objectContaining({ code: Errors.INVALID_TRANSCRIPT_SEGMENT }),
  )
})
