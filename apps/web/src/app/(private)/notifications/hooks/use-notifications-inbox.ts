'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { FILTERS, type InboxFilter } from '../data/inbox-filters'

/** The page asks for a long slice; the bell asks for a short one — same feed. */
const INBOX_SIZE = 100

export function useNotificationsInbox() {
  const [filter, setFilter] = useState<InboxFilter>('all')
  const { items, unreadCount, isLoading, markAsRead, markAllAsRead, remove, clearAll } =
    useNotifications(INBOX_SIZE)

  const visible = filter === 'unread' ? items.filter((item) => !item.read) : items

  return {
    filters: FILTERS,
    filter,
    setFilter,
    items: visible,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    remove,
    clearAll,
  }
}
