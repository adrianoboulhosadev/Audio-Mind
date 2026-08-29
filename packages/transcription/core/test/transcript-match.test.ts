import { findTranscriptMatch } from '../src'

const TEXT =
  'Bom dia a todos. Falamos do contrato de aluguel, que vence em março. Depois vimos as entregas.'

const SEGMENTS = [
  { startSeconds: 0, endSeconds: 3, text: 'Bom dia a todos.' },
  { startSeconds: 3, endSeconds: 9, text: 'Falamos do contrato de aluguel, que vence em março.' },
  { startSeconds: 9, endSeconds: 14, text: 'Depois vimos as entregas.' },
]

test('prefers the SEGMENT: a whole sentence, with the second it was said', () => {
  const match = findTranscriptMatch(TEXT, SEGMENTS, 'contrato')

  expect(match).toEqual({
    excerpt: 'Falamos do contrato de aluguel, que vence em março.',
    startSeconds: 3,
  })
})

test('matching is case-insensitive, like the query that found the row', () => {
  expect(findTranscriptMatch(TEXT, SEGMENTS, 'CONTRATO')?.startSeconds).toBe(3)
})

test('with no segments there is still something to read, just no moment to jump to', () => {
  const match = findTranscriptMatch(TEXT, [], 'contrato')

  expect(match?.startSeconds).toBeNull()
  expect(match?.excerpt).toContain('contrato')
})

test('a long transcript is cut around the term, with ellipses where it was cut', () => {
  const filler = 'palavra '.repeat(60)
  const match = findTranscriptMatch(`${filler}contrato ${filler}`, [], 'contrato')

  expect(match?.excerpt.startsWith('…')).toBe(true)
  expect(match?.excerpt.endsWith('…')).toBe(true)
  expect(match?.excerpt).toContain('contrato')
})

test('a term that is not there answers null — the row matched on something else', () => {
  expect(findTranscriptMatch(TEXT, SEGMENTS, 'orçamento')).toBeNull()
  expect(findTranscriptMatch(TEXT, SEGMENTS, '   ')).toBeNull()
})
