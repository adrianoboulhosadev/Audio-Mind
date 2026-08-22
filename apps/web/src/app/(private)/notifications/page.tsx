'use client'

import Link from 'next/link'
import { Loading } from '@/components/loading'
import { formatRelative } from '@/lib/format'
import { useNotificationsInbox } from './hooks/use-notifications-inbox'

export default function NotificationsPage() {
  const {
    filters,
    filter,
    setFilter,
    items,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    remove,
    clearAll,
  } = useNotificationsInbox()

  if (isLoading) return <Loading />

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line2 p-1">
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                filter === option.id ? 'bg-accent text-accent-ink' : 'text-ink2 hover:text-ink'
              }`}
            >
              {option.label}
              {option.id === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>

        <div className="flex gap-3 text-xs">
          {unreadCount > 0 ? (
            <button type="button" onClick={() => markAllAsRead()} className="text-accent hover:underline">
              marcar todas como lidas
            </button>
          ) : null}
          {items.length > 0 ? (
            <button type="button" onClick={() => clearAll()} className="text-muted hover:text-bad">
              limpar tudo
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line2 px-4 py-12 text-center text-sm text-muted">
          Nada por aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border p-4 transition ${
                item.read ? 'border-line2 bg-panel' : 'border-accent/40 bg-accent-soft/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink2">{item.body}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {formatRelative(item.createdAt)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {item.link ? (
                  <Link
                    href={item.link}
                    onClick={() => !item.read && markAsRead(item.id)}
                    className="text-accent hover:underline"
                  >
                    abrir
                  </Link>
                ) : null}
                {!item.read ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="text-muted hover:text-ink"
                  >
                    marcar como lida
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="text-muted hover:text-bad"
                >
                  excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
