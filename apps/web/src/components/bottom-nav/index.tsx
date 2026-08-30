'use client'

import Link from 'next/link'
import { useActiveNav } from '@/hooks/use-active-nav'
import { useNavItems } from '@/hooks/use-nav-items'

/**
 * The phone's navigation: a fixed bar at the bottom, every screen one tap away.
 *
 * A bar and not a drawer because this app has THREE screens. A drawer buys room
 * for a long menu by charging a tap for every trip, and there is no long menu
 * here to pay for — it only put the whole app behind a hamburger.
 *
 * `pb-[env(safe-area-inset-bottom)]` keeps the labels above the home indicator
 * on a notched phone, where the last few pixels of the viewport are not really
 * tappable.
 */
export function BottomNav() {
  const isActive = useActiveNav()
  const items = useNavItems()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="flex">
        {items.map(({ href, shortLabel, label, Icon }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-label={label}
              aria-current={isActive(href) ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] transition ${
                isActive(href) ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={22} aria-hidden />
              <span className="leading-none">{shortLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
