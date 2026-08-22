'use client'

import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '@/hooks/use-notifications'

/** How many lines the panel shows — the page shows the rest. */
const PANEL_SIZE = 6

export function useNotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { items, unreadCount, markAsRead, markAllAsRead } = useNotifications(PANEL_SIZE)

  // Escape and a click outside both close it — a panel anchored to a button
  // that only closes by clicking the button again feels stuck.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  return {
    open,
    toggle: () => setOpen((current) => !current),
    close: () => setOpen(false),
    containerRef,
    items,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }
}
