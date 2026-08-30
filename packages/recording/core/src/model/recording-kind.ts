/**
 * What KIND of audio this is — the one thing that changes what a good summary of
 * it looks like. A class is not a meeting: one wants concepts and what to study,
 * the other wants decisions and who owes what.
 *
 * It is a plain union with a fail-closed reader (like `UserRole` and
 * `RecordingSource`), not a class: it carries no rule of its own beyond "be one
 * of these", and the actual INSTRUCTIONS behind each one live in the worker's
 * adapter, next to the model id and the retry policy — they are the prompt, and
 * a prompt is infrastructure.
 */
export type RecordingKind = 'meeting' | 'class' | 'medical' | 'interview' | 'note' | 'other'

export const RECORDING_KINDS: readonly RecordingKind[] = [
  'meeting',
  'class',
  'medical',
  'interview',
  'note',
  'other',
]

/** The kind of an audio nobody classified — and the one every unknown value
 * reads as. FAIL-CLOSED: a typo in a request (or a kind removed from the list
 * later) falls back to the generic summary, never to somebody else's template. */
export const DEFAULT_RECORDING_KIND: RecordingKind = 'other'

export function toRecordingKind(value?: string | null): RecordingKind {
  return RECORDING_KINDS.includes(value as RecordingKind)
    ? (value as RecordingKind)
    : DEFAULT_RECORDING_KIND
}
