import type { RecordingStatus } from '@recording/adapters'

/** O rótulo de cada estágio do pipeline no painel de admin. Um Record sobre a
 * união do domínio: um estágio novo lá obriga um rótulo aqui, em vez de sumir
 * silenciosamente do quadro. */
export const PIPELINE_LABELS: Record<RecordingStatus, string> = {
  pending: 'Na fila',
  transcribing: 'Transcrevendo',
  summarizing: 'Resumindo',
  ready: 'Prontas',
  failed: 'Falharam',
}
