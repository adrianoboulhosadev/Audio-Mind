'use client'

import { useRouter } from 'next/navigation'
import { CheckCheck, SquareArrowOutUpRight, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
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
  const router = useRouter()

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

        {/* Two bulk actions, one of which empties the inbox — as icons they need
            their names on hover, which is what IconButton's tooltip is for. */}
        <div className="flex items-center gap-1">
          {unreadCount > 0 ? (
            <IconButton
              label="Marcar todas como lidas"
              tone="accent"
              tipSide="left"
              onClick={() => markAllAsRead()}
              icon={<CheckCheck size={18} aria-hidden />}
            />
          ) : null}
          {items.length > 0 ? (
            <IconButton
              label="Limpar tudo"
              tone="danger"
              tipSide="left"
              onClick={() => clearAll()}
              icon={<Trash2 size={18} aria-hidden />}
            />
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
              /* Unread differs by GROUND, not by border. A coloured outline read
                 like a validation error on a screen that has red failure notices
                 in it; a slightly lifted background plus the dot below says "new"
                 without competing with them. */
              className={`relative rounded-xl border border-line2 p-4 transition ${
                item.read ? 'bg-panel' : 'bg-accent-soft/25'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink2">{item.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-muted">{formatRelative(item.createdAt)}</span>
                  {!item.read ? (
                    <span
                      // Decoration for the eye, words for everything else: the
                      // dot repeats what the background already says, and a
                      // screen reader gets the sentence instead of a bullet.
                      role="status"
                      aria-label="Não lida"
                      className="h-2 w-2 shrink-0 rounded-full bg-accent"
                    />
                  ) : null}
                </div>
              </div>

              {/* Pulled into the card's padding — an icon button is mostly
                  padding, and laid out normally it leaves a band of empty card. */}
              <div className="-mb-1.5 -mr-1.5 mt-0 flex items-center justify-end gap-0.5">
                {item.link ? (
                  <IconButton
                    label="Abrir"
                    tone="accent"
                    onClick={() => {
                      if (!item.read) markAsRead(item.id)
                      router.push(item.link!)
                    }}
                    icon={<SquareArrowOutUpRight size={17} aria-hidden />}
                  />
                ) : null}
                {!item.read ? (
                  <IconButton
                    label="Marcar como lida"
                    tipSide="left"
                    onClick={() => markAsRead(item.id)}
                    icon={<CheckCheck size={17} aria-hidden />}
                  />
                ) : null}
                <IconButton
                  label="Excluir"
                  tone="danger"
                  tipSide="left"
                  onClick={() => remove(item.id)}
                  icon={<Trash2 size={17} aria-hidden />}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
