import { toGeneratedSummary } from '../src/extraction'

const MODEL = 'llama-3.3-70b-versatile'

test('maps the answer we asked for', () => {
  const result = toGeneratedSummary(
    {
      headline: ' Reunião de alinhamento ',
      overview: 'O time revisou as entregas.',
      topics: ['Entregas da semana', 'Riscos'],
      action_items: ['Fechar o escopo'],
    },
    MODEL,
  )

  expect(result).toEqual({
    headline: 'Reunião de alinhamento',
    overview: 'O time revisou as entregas.',
    topics: ['Entregas da semana', 'Riscos'],
    actionItems: ['Fechar o escopo'],
    model: MODEL,
  })
})

test('accepts a list the model wrote as one multi-line string', () => {
  const result = toGeneratedSummary(
    { headline: 'x', overview: 'y', topics: '- Entregas\n- Riscos\n' },
    MODEL,
  )

  expect(result.topics).toEqual(['Entregas', 'Riscos'])
})

test('strips the bullet the model adds even inside a real array', () => {
  const result = toGeneratedSummary({ topics: ['1. Entregas', '* Riscos'] }, MODEL)
  expect(result.topics).toEqual(['Entregas', 'Riscos'])
})

test('never INVENTS content — a missing overview stays empty so the domain refuses it', () => {
  const result = toGeneratedSummary({ headline: 'x' }, MODEL)

  expect(result.overview).toBe('')
  expect(result.topics).toEqual([])
  expect(result.actionItems).toEqual([])
})

test('survives a model that answers with the wrong types', () => {
  const result = toGeneratedSummary({ headline: 42, overview: null, topics: { a: 1 } }, MODEL)

  expect(result.headline).toBe('')
  expect(result.overview).toBe('')
  expect(result.topics).toEqual([])
})
