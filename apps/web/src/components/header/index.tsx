'use client'

import { NotificationBell } from '@/components/notification-bell'
import { ICONS } from '@/components/sidebar/data/icons'
import { useHeader } from './hooks/use-header'

export function Header() {
  const { title, user, logout, openMenu } = useHeader()

  return (
    <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-panel/80 px-4 py-3 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={openMenu}
        aria-label="Abrir menu"
        className="rounded-lg p-2 text-ink2 transition hover:bg-panel2 hover:text-ink lg:hidden"
      >
        {ICONS.menu}
      </button>

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{title}</h1>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <span className="hidden max-w-[12rem] truncate text-sm text-muted sm:block">
          {user?.name || user?.email}
        </span>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-lg border border-line2 px-3 py-1.5 text-xs text-ink2 transition hover:bg-panel2 hover:text-ink"
        >
          sair
        </button>
      </div>
    </header>
  )
}
