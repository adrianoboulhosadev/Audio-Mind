import { Errors } from 'shared'
import {
  DeleteSummary,
  GetSummaryPdfQuery,
  GetSummaryQuery,
  RenderSummaryPdf,
  SummarizeTranscript,
} from '../src'
import { PdfRendererInMemory, SummaryGeneratorInMemory, SummaryRepositoryInMemory } from './in-memory'

const INPUT = {
  recordingId: 'rec-1',
  recordingTitle: 'Daily do time',
  transcript: 'Bom dia, vamos revisar as entregas da semana.',
}

test('stores what the model wrote, along with the model that wrote it', async () => {
  const repository = new SummaryRepositoryInMemory()
  const generator = new SummaryGeneratorInMemory()

  await new SummarizeTranscript(repository, generator).execute(INPUT)

  const summary = await new GetSummaryQuery(repository).execute('rec-1')
  expect(summary.headline).toBe('Alinhamento do time')
  expect(summary.topics).toEqual(['Entregas da semana', 'Riscos do projeto'])
  expect(summary.model).toBe('llama-3.3-70b-versatile')
  expect(summary.pdfUrl).toBeNull()
  // The title is what tells the model the subject — a bare transcript often does not.
  expect(generator.calls[0]).toMatchObject({ recordingTitle: 'Daily do time' })
})

test('a model that answers with nothing throws instead of saving an empty summary', async () => {
  const repository = new SummaryRepositoryInMemory()
  const generator = new SummaryGeneratorInMemory({ overview: '   ' })

  await expect(new SummarizeTranscript(repository, generator).execute(INPUT)).rejects.toMatchObject({
    code: Errors.EMPTY_SUMMARY,
  })
  expect(repository.size).toBe(0)
})

test('re-running REPLACES the summary instead of piling up a second one', async () => {
  const repository = new SummaryRepositoryInMemory()

  await new SummarizeTranscript(repository, new SummaryGeneratorInMemory()).execute(INPUT)
  await new SummarizeTranscript(
    repository,
    new SummaryGeneratorInMemory({ headline: 'Segunda tentativa' }),
  ).execute(INPUT)

  expect(repository.size).toBe(1)
  expect((await new GetSummaryQuery(repository).execute('rec-1')).headline).toBe('Segunda tentativa')
})

test('rendering the PDF attaches its path to the stored summary', async () => {
  const repository = new SummaryRepositoryInMemory()
  const renderer = new PdfRendererInMemory()
  await new SummarizeTranscript(repository, new SummaryGeneratorInMemory()).execute(INPUT)

  await new RenderSummaryPdf(repository, renderer).execute({
    recordingId: 'rec-1',
    recordingTitle: 'Daily do time',
  })

  expect(await new GetSummaryPdfQuery(repository).execute('rec-1')).toBe(
    '/uploads/summaries/rec-1.pdf',
  )
  // The CONTENT crossed the port — the renderer never sees the entity.
  expect(renderer.calls[0]).toMatchObject({ headline: 'Alinhamento do time', topics: expect.any(Array) })
})

test('a failed render leaves the summary readable — only the PDF is missing', async () => {
  const repository = new SummaryRepositoryInMemory()
  const renderer = new PdfRendererInMemory(new Error('disk full'))
  await new SummarizeTranscript(repository, new SummaryGeneratorInMemory()).execute(INPUT)

  await expect(
    new RenderSummaryPdf(repository, renderer).execute({
      recordingId: 'rec-1',
      recordingTitle: 'Daily do time',
    }),
  ).rejects.toThrow('disk full')

  await expect(new GetSummaryQuery(repository).execute('rec-1')).resolves.toMatchObject({
    pdfUrl: null,
  })
  await expect(new GetSummaryPdfQuery(repository).execute('rec-1')).rejects.toMatchObject({
    code: Errors.PDF_NOT_AVAILABLE,
  })
})

test('reading a summary that does not exist answers SUMMARY_NOT_FOUND', async () => {
  const repository = new SummaryRepositoryInMemory()
  await expect(new GetSummaryQuery(repository).execute('rec-9')).rejects.toMatchObject({
    code: Errors.SUMMARY_NOT_FOUND,
  })
})

test('deleting is idempotent — a recording that failed early simply has none', async () => {
  const repository = new SummaryRepositoryInMemory()
  await expect(new DeleteSummary(repository).execute('rec-1')).resolves.toBeUndefined()
})
