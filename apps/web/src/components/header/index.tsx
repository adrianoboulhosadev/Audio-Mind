'use client'

import { LogOut } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { NotificationBell } from '@/components/notification-bell'
import { useHeader } from './hooks/use-header'

export function Header() {
  const { title, user, logout } = useHeader()

  return (
    <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-panel/80 px-4 py-3 backdrop-blur sm:px-6">
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{title}</h1>

      {/* Roomier than the rest of the header on purpose: these three sit next to
          each other but do unrelated things, and "sair" is the one action here
          nobody wants to hit by accident. */}
      <div className="flex items-center gap-4 sm:gap-6">
        <NotificationBell />
        <span className="hidden max-w-[12rem] truncate text-sm text-muted sm:block">
          {user?.name || user?.email}
        </span>
        <IconButton
          label="Sair da conta"
          tipSide="left"
          onClick={() => logout()}
          icon={<LogOut size={18} aria-hidden />}
        />
      </div>
    </header>
  )
}
