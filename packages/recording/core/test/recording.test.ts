import { Errors } from 'shared'
import { Recording, RecordingFailed, RecordingReady, RecordingTitle } from '../src'

function build(overrides: Record<string, unknown> = {}): Recording {
  return new Recording({
    ownerId: 'owner-1',
    title: 'Reunião de segunda',
    source: 'record',
    audioUrl: '/uploads/audios/abc.webm',
    mimeType: 'audio/webm',
    sizeBytes: 1_000_000,
    durationSeconds: 120,
    ...overrides,
  })
}

describe('RecordingTitle', () => {
  it('demands a value and caps the length', () => {
    expect(() => new RecordingTitle('   ')).toThrow(
      expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
    )
    expect(() => new RecordingTitle('a'.repeat(121))).toThrow(
      expect.objectContaining({ code: Errors.RECORDING_TITLE_TOO_LONG }),
    )
  })
})

describe('Recording', () => {
  it('starts pending, with no failure reason', () => {
    const recording = build()
    expect(recording.status).toBe('pending')
    expect(recording.failureReason).toBeNull()
    expect(recording.isProcessing).toBe(false)
  })

  it('demands an owner', () => {
    expect(() => build({ ownerId: '  ' })).toThrow(
      expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
    )
  })

  it('walks the pipeline in order and records RecordingReady at the end', () => {
    const recording = build()

    recording.startTranscription()
    expect(recording.status).toBe('transcribing')
    recording.startSummarization()
    expect(recording.status).toBe('summarizing')
    recording.markAsReady()

    expect(recording.status).toBe('ready')
    const events = recording.pullDomainEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(RecordingReady)
  })

  it('refuses to skip a stage — summarizing something never transcribed', () => {
    const recording = build()
    expect(() => recording.startSummarization()).toThrow(
      expect.objectContaining({ code: Errors.INVALID_RECORDING_STATUS }),
    )
  })

  it('re-delivering the same stage is a no-op, not an error', () => {
    const recording = build()
    recording.startTranscription()
    expect(() => recording.startTranscription()).not.toThrow()
    expect(recording.status).toBe('transcribing')
  })

  it('fail carries the reason and records RecordingFailed', () => {
    const recording = build()
    recording.startTranscription()

    recording.fail('  O áudio não tem fala audível.  ')

    expect(recording.status).toBe('failed')
    expect(recording.failureReason).toBe('O áudio não tem fala audível.')
    expect(recording.pullDomainEvents()[0]).toBeInstanceOf(RecordingFailed)
  })

  it('failing twice keeps the FIRST reason — the first failure is the real cause', () => {
    const recording = build()
    recording.fail('sem chave da API')
    recording.pullDomainEvents()

    recording.fail('outra coisa qualquer')

    expect(recording.failureReason).toBe('sem chave da API')
    expect(recording.pullDomainEvents()).toHaveLength(0)
  })

  it('never fails a recording that already reached ready', () => {
    const recording = build()
    recording.startTranscription()
    recording.startSummarization()
    recording.markAsReady()

    expect(() => recording.fail('tarde demais')).toThrow(
      expect.objectContaining({ code: Errors.INVALID_RECORDING_STATUS }),
    )
  })

  it('retry re-parks a failed recording and clears the reason', () => {
    const recording = build()

    recording.fail('deu ruim')
    recording.retry()

    expect(recording.status).toBe('pending')
    expect(recording.failureReason).toBeNull()
  })

  it('retry also re-parks a READY recording — that is how an old audio gets the current pipeline', () => {
    const recording = build()
    recording.startTranscription()
    recording.startSummarization()
    recording.markAsReady()

    recording.retry()

    expect(recording.status).toBe('pending')
  })

  it('retry refuses a recording a job is already on', () => {
    const recording = build()

    // pending: the job is queued and has not started.
    expect(() => recording.retry()).toThrow(
      expect.objectContaining({ code: Errors.RECORDING_IN_PIPELINE }),
    )

    recording.startTranscription()
    expect(() => recording.retry()).toThrow(
      expect.objectContaining({ code: Errors.RECORDING_IN_PIPELINE }),
    )

    recording.startSummarization()
    expect(() => recording.retry()).toThrow(
      expect.objectContaining({ code: Errors.RECORDING_IN_PIPELINE }),
    )
  })

  it('adopts the summary s headline only while nobody named the audio', () => {
    const unnamed = build({ title: RecordingTitle.PLACEHOLDER })
    unnamed.adoptSuggestedTitle('Reunião sobre o contrato')
    expect(unnamed.title.value).toBe('Reunião sobre o contrato')

    // A name the person typed is theirs — a model never steps on it.
    const named = build({ title: 'Consulta médica' })
    named.adoptSuggestedTitle('Reunião sobre o contrato')
    expect(named.title.value).toBe('Consulta médica')
  })

  it('an empty suggestion leaves the placeholder alone', () => {
    const recording = build({ title: RecordingTitle.PLACEHOLDER })
    recording.adoptSuggestedTitle('   ')
    expect(recording.title.value).toBe(RecordingTitle.PLACEHOLDER)
  })

  it('rename applies the title rule and touches updatedAt', () => {
    const recording = build()
    recording.rename('  Outro nome  ')
    expect(recording.title.value).toBe('Outro nome')
    expect(() => recording.rename('')).toThrow(
      expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
    )
  })
})
