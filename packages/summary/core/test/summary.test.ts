import { Errors } from 'shared'
import { Summary, SummaryBullet, SummaryHeadline, SummaryOverview } from '../src'

function build(overrides: Record<string, unknown> = {}): Summary {
  return new Summary({
    recordingId: 'rec-1',
    headline: 'Alinhamento do time',
    overview: 'O time revisou as entregas da semana.',
    topics: ['Entregas', 'Riscos'],
    actionItems: ['Fechar o escopo'],
    model: 'llama-3.3-70b-versatile',
    ...overrides,
  })
}

describe('the summary value objects', () => {
  it('refuse empty text — an empty summary is not a summary', () => {
    expect(() => new SummaryHeadline('  ')).toThrow(
      expect.objectContaining({ code: Errors.EMPTY_SUMMARY }),
    )
    expect(() => new SummaryOverview('')).toThrow(
      expect.objectContaining({ code: Errors.EMPTY_SUMMARY }),
    )
  })

  it('cap each piece at its own ceiling', () => {
    expect(() => new SummaryHeadline('a'.repeat(151))).toThrow(
      expect.objectContaining({ code: Errors.SUMMARY_TEXT_TOO_LONG }),
    )
    expect(() => new SummaryBullet('a'.repeat(301))).toThrow(
      expect.objectContaining({ code: Errors.SUMMARY_TEXT_TOO_LONG }),
    )
  })

  it('collapse whitespace on the one-liners', () => {
    expect(new SummaryHeadline(' Reunião   do  time ').value).toBe('Reunião do time')
  })
})

describe('Summary', () => {
  it('demands the recording it belongs to and the model that wrote it', () => {
    expect(() => build({ recordingId: ' ' })).toThrow(
      expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
    )
    expect(() => build({ model: '' })).toThrow(
      expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
    )
  })

  it('drops blank bullets instead of failing the whole audio over a trailing line', () => {
    const summary = build({ topics: ['Entregas', '   ', 'Riscos'] })
    expect(summary.topics.map((topic) => topic.value)).toEqual(['Entregas', 'Riscos'])
  })

  it('refuses a wall of bullets — that is a transcript, not a summary', () => {
    expect(() => build({ topics: Array.from({ length: 13 }, (_, index) => `item ${index}`) })).toThrow(
      expect.objectContaining({ code: Errors.TOO_MANY_SUMMARY_ITEMS }),
    )
  })

  it('starts with no PDF and attaches one later', () => {
    const summary = build()
    expect(summary.hasPdf).toBe(false)

    summary.attachPdf(' /uploads/summaries/rec-1.pdf ')

    expect(summary.pdfUrl).toBe('/uploads/summaries/rec-1.pdf')
    expect(summary.hasPdf).toBe(true)
  })

  it('refuses an empty PDF path', () => {
    expect(() => build().attachPdf('   ')).toThrow(
      expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
    )
  })
})
