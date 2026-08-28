'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { formatRelative } from '@/lib/format'
import { useNotificationBell } from './hooks/use-notification-bell'

/** Anything past this is shown as "99+" — the badge is a hint, not a counter. */
const BADGE_CAP = 99

export function NotificationBell() {
  const { open, toggle, close, containerRef, items, unreadCount, markAsRead, markAllAsRead } =
    useNotificationBell()

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificações"
        className="relative rounded-lg p-2 text-ink2 transition hover:bg-panel2 hover:text-ink"
      >
        <Bell size={20} aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-accent px-1 text-[10px] font-semibold leading-[18px] text-accent-ink">
            {unreadCount > BADGE_CAP ? `${BADGE_CAP}+` : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line2 bg-panel shadow-pop animate-fadeUp">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-medium text-ink">Notificações</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs text-accent hover:underline"
              >
                marcar todas
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Nada por aqui ainda.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b border-line last:border-0">
                  <Link
                    href={item.link ?? '/notifications'}
                    onClick={() => {
                      if (!item.read) markAsRead(item.id)
                      close()
                    }}
                    className={`block px-4 py-3 transition hover:bg-panel2 ${item.read ? '' : 'bg-accent-soft/40'}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-ink">{item.title}</span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {formatRelative(item.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink2">{item.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={close}
            className="block border-t border-line px-4 py-2.5 text-center text-xs text-accent hover:bg-panel2"
          >
            ver todas
          </Link>
        </div>
      ) : null}
    </div>
  )
}
