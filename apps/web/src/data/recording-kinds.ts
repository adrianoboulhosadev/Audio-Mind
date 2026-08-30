import type { RecordingKind } from '@recording/adapters'

/**
 * What each kind of audio is called on screen, and the one line that says what
 * changes when you pick it.
 *
 * The UNION comes from the domain (`RecordingKind`), so a kind added there
 * without a label here fails the build instead of rendering a blank option. Two
 * screens read this — the composer and the detail — so it lives in `src/data`.
 */
export const RECORDING_KIND_LABELS: Record<RecordingKind, string> = {
  meeting: 'Reunião',
  class: 'Aula',
  medical: 'Consulta médica',
  interview: 'Entrevista',
  note: 'Recado / nota de voz',
  other: 'Outro',
}

/** What the summary will look for, in the user's words. Shown under the picker,
 * because "reunião" and "aula" only mean something once you know they change
 * what comes out. */
export const RECORDING_KIND_HINTS: Record<RecordingKind, string> = {
  meeting: 'Decisões tomadas e o que ficou combinado, com responsável e prazo.',
  class: 'Conceitos explicados, o que estudar e as dúvidas em aberto.',
  medical: 'Sintomas, orientações, medicação e quando é o retorno.',
  interview: 'As perguntas e o essencial de cada resposta.',
  note: 'As ideias registradas e o que você disse que precisa fazer.',
  other: 'Um resumo geral: pontos principais e próximos passos.',
}
