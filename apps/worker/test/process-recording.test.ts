import { RecordingFacade, RecordingTitle } from '@recording/adapters'
import { SummaryFacade } from '@summary/adapters'
import { TaskFacade } from '@task/adapters'
import { TranscriptionFacade } from '@transcription/adapters'
import { Errors, ValidationError } from 'shared'
import { processRecording } from '../src/pipeline/process-recording'
import {
  FakePdfRenderer,
  FakeSpeechToText,
  FakeSummaryGenerator,
  RecordingStore,
  SummaryStore,
  TaskStore,
  TranscriptionStore,
} from './in-memory/stores'

const RECORDING_ID = '11111111-1111-4111-8111-111111111111'

function setup(
  options: {
    status?: string
    title?: string
    speechToText?: FakeSpeechToText
    generator?: FakeSummaryGenerator
  } = {},
) {
  const recordingStore = new RecordingStore()
  recordingStore.seed({
    id: RECORDING_ID,
    ownerId: 'owner-1',
    title: options.title ?? 'Daily do time',
    source: 'upload',
    audioUrl: '/uploads/audios/abc.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 1_000_000,
    durationSeconds: 300,
    status: (options.status ?? 'pending') as never,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const transcriptionStore = new TranscriptionStore()
  const summaryStore = new SummaryStore()
  const speechToText = options.speechToText ?? new FakeSpeechToText()
  const generator = options.generator ?? new FakeSummaryGenerator()
  const renderer = new FakePdfRenderer()
  const taskStore = new TaskStore()

  return {
    recordingStore,
    transcriptionStore,
    summaryStore,
    speechToText,
    generator,
    renderer,
    taskStore,
    deps: {
      recordings: new RecordingFacade(recordingStore, recordingStore),
      transcriptions: new TranscriptionFacade(transcriptionStore, transcriptionStore, speechToText),
      summaries: new SummaryFacade(summaryStore, summaryStore, generator, renderer),
      tasks: new TaskFacade(taskStore),
      summaryLanguage: 'pt',
    },
  }
}

test('runs the whole pipeline and leaves the recording ready', async () => {
  const context = setup()

  await processRecording(RECORDING_ID, context.deps)

  const recording = context.recordingStore.get(RECORDING_ID)
  expect(recording.status).toBe('ready')
  expect(recording.failureReason).toBeNull()
  expect(await context.transcriptionStore.findByRecordingQuery(RECORDING_ID)).toMatchObject({
    text: 'Bom dia, vamos revisar as entregas.',
  })
  // The PDF is rendered BEFORE the recording is called ready, so "pronto" never
  // links to a download that does nothing.
  expect(await context.summaryStore.findByRecordingQuery(RECORDING_ID)).toMatchObject({
    pdfUrl: `/uploads/summaries/${RECORDING_ID}.pdf`,
  })
})

test('hands the transcription port an absolute path and the summary the audio title', async () => {
  const context = setup()

  await processRecording(RECORDING_ID, context.deps)

  expect(context.speechToText.calls[0].audioPath).toMatch(/uploads[/\\]audios[/\\]abc\.mp3$/)
  expect(context.speechToText.calls[0].audioPath.startsWith('/uploads/')).toBe(false)
  expect(context.generator.calls[0]).toMatchObject({ recordingTitle: 'Daily do time', language: 'pt' })
})

test('a recording already ready is a NO-OP — a duplicated job never re-runs the model', async () => {
  const context = setup({ status: 'ready' })

  await processRecording(RECORDING_ID, context.deps)

  expect(context.speechToText.calls).toHaveLength(0)
  expect(context.generator.calls).toHaveLength(0)
})

test('resumes from `summarizing` without paying for the transcription twice', async () => {
  const context = setup({ status: 'summarizing' })
  await context.transcriptionStore.save(
    new (await import('@transcription/adapters')).Transcription({
      recordingId: RECORDING_ID,
      text: 'Texto que já tinha sido transcrito.',
      model: 'whisper-large-v3',
    }),
  )

  await processRecording(RECORDING_ID, context.deps)

  expect(context.speechToText.calls).toHaveLength(0)
  expect(context.generator.calls[0].transcript).toBe('Texto que já tinha sido transcrito.')
  expect(context.recordingStore.get(RECORDING_ID).status).toBe('ready')
})

test('a silent audio becomes a FAILED recording with a reason the owner can act on', async () => {
  const context = setup({ speechToText: new FakeSpeechToText('   ') })

  await processRecording(RECORDING_ID, context.deps)

  const recording = context.recordingStore.get(RECORDING_ID)
  expect(recording.status).toBe('failed')
  expect(recording.failureReason).toContain('nenhuma fala')
})

test('a model that fails mid-summary never leaves the recording stuck on transcribing', async () => {
  const context = setup({
    generator: new FakeSummaryGenerator(ValidationError.create(Errors.EMPTY_SUMMARY)),
  })

  await processRecording(RECORDING_ID, context.deps)

  const recording = context.recordingStore.get(RECORDING_ID)
  expect(recording.status).toBe('failed')
  expect(recording.failureReason).toContain('resumo')
})

test('names an audio nobody named, using the summary s headline', async () => {
  const context = setup({ title: RecordingTitle.PLACEHOLDER })

  await processRecording(RECORDING_ID, context.deps)

  const summary = await context.summaryStore.findByRecordingQuery(RECORDING_ID)
  expect(context.recordingStore.get(RECORDING_ID).title).toBe(summary!.headline)
  // And the PDF carries the FINAL name, not the placeholder it started with.
  expect(context.renderer.calls[0].recordingTitle).toBe(summary!.headline)
})

test('a title the person typed survives the pipeline', async () => {
  const context = setup({ title: 'Daily do time' })

  await processRecording(RECORDING_ID, context.deps)

  expect(context.recordingStore.get(RECORDING_ID).title).toBe('Daily do time')
})

test('os action items do resumo viram tarefas — e reprocessar não duplica', async () => {
  const context = setup({
    generator: new FakeSummaryGenerator(undefined, ['Mandar a proposta', 'Marcar a reunião']),
  })

  await processRecording(RECORDING_ID, context.deps)
  expect(context.taskStore.texts.sort()).toEqual(['Mandar a proposta', 'Marcar a reunião'])

  // O mesmo áudio processado de novo: a lista é reconciliada, não empilhada.
  context.recordingStore.get(RECORDING_ID).status = 'pending'
  await processRecording(RECORDING_ID, context.deps)
  expect(context.taskStore.texts).toHaveLength(2)
})
