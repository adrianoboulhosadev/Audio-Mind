/** The union lives next to the data it enumerates — that is what keeps a new
 * filter from being added in one place and forgotten in the other. */
export type InboxFilter = 'all' | 'unread'

export const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
]
