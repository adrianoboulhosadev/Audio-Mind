'use client'

import Link from 'next/link'
import { AudioLines } from 'lucide-react'
import { useActiveNav } from '@/hooks/use-active-nav'
import { NAV_ITEMS } from './data/nav-items'

/**
 * The desktop navigation, and ONLY the desktop navigation: below `lg` it is not
 * rendered at all and the BottomNav takes over. It used to be the same component
 * doing both jobs through a slide-out drawer, which meant a phone reached its
 * navigation in two taps (open, then choose) for a three-item app.
 */
export function Sidebar() {
  const isActive = useActiveNav()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-panel lg:flex">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Link href="/recordings" className="flex items-center gap-2 text-ink">
          <AudioLines size={20} className="text-accent" aria-hidden />
          <span className="text-sm font-semibold tracking-wide">Audio-Mind</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              isActive(href)
                ? 'bg-accent-soft text-accent'
                : 'text-ink2 hover:bg-panel2 hover:text-ink'
            }`}
          >
            <Icon size={20} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
