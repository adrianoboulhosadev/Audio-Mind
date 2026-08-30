/** Which slice of the list to read. */
export type TaskFilter = 'pending' | 'done' | 'all'

export const TASK_FILTERS: readonly TaskFilter[] = ['pending', 'done', 'all']

/**
 * Reads the filter that arrived from a query string, FAIL-CLOSED: anything that
 * is not one of the three reads as "pending". The default matters — a garbage
 * value that fell through to "all" would quietly answer with more than the
 * caller asked for.
 */
export function toTaskFilter(value?: string): TaskFilter {
  return TASK_FILTERS.includes(value as TaskFilter) ? (value as TaskFilter) : 'pending'
}
