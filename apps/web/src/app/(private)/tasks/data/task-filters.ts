import type { TaskFilter } from '@task/adapters'

/** The union lives in the DOMAIN (it is what the query accepts), so this file
 * only carries the labels — the two can never drift apart. */
export const TASK_FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'pending', label: 'A fazer' },
  { id: 'done', label: 'Feitas' },
  { id: 'all', label: 'Todas' },
]
