import type { RecordingStatus } from '@recording/adapters'

/**
 * A Record keyed by the domain union, not an array: TypeScript then FORCES a
 * new status to be given a label here, instead of letting the UI silently fall
 * through to a blank badge.
 */
export const STATUS_INFO: Record<RecordingStatus, { label: string; className: string }> = {
  pending: { label: 'Na fila', className: 'border-line2 bg-panel2 text-muted' },
  transcribing: { label: 'Transcrevendo', className: 'border-accent/40 bg-accent-soft text-accent' },
  summarizing: { label: 'Resumindo', className: 'border-accent/40 bg-accent-soft text-accent' },
  ready: { label: 'Pronto', className: 'border-good/40 bg-good/10 text-good' },
  failed: { label: 'Falhou', className: 'border-bad/40 bg-bad/10 text-bad' },
}
