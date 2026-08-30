import type { ShareWindow } from '@sharing/adapters'

/** The labels of the three validity windows. The UNION and the list itself come
 * from the domain (`SHARE_WINDOWS`), so a window added or removed there cannot
 * leave the picker offering something the backend refuses. */
export const SHARE_WINDOW_LABELS: Record<ShareWindow, string> = {
  '24h': '24 horas',
  '7d': '7 dias',
  '30d': '30 dias',
}
