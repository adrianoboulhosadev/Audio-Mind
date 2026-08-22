import { Errors } from 'shared'
import { TranscriptText, Transcription } from '../src'

test('an empty answer is NOT a transcript', () => {
  expect(() => new TranscriptText('   ')).toThrow(
    expect.objectContaining({ code: Errors.EMPTY_TRANSCRIPT }),
  )
})

test('caps a pathological length', () => {
  expect(() => new TranscriptText('a'.repeat(TranscriptText.MAX_LENGTH + 1))).toThrow(
    expect.objectContaining({ code: Errors.TRANSCRIPT_TOO_LONG }),
  )
})

test('counts words and collapses whitespace in the preview', () => {
  const text = new TranscriptText('  Bom   dia\n a todos ')
  expect(text.wordCount).toBe(4)
  expect(text.preview()).toBe('Bom dia a todos')
})

test('the preview ellipsizes instead of returning the whole text', () => {
  expect(new TranscriptText('a'.repeat(500)).preview(10)).toHaveLength(10)
})

test('Transcription demands the recording it belongs to and the model that produced it', () => {
  expect(() => new Transcription({ text: 'oi', model: 'whisper' })).toThrow(
    expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
  )
  expect(() => new Transcription({ recordingId: 'rec-1', text: 'oi' })).toThrow(
    expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
  )
})
