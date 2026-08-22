'use client'

import type { ReactNode } from 'react'
import { Loading } from '@/components/loading'
import { useRedirectAuthenticated } from '@/hooks/use-redirect-authenticated'

/**
 * Guard of the public group, plus the frame both screens share — login and
 * register were repeating the same centered card, and identical wrapper JSX
 * across a group belongs to the group's layout.
 *
 * `min-w-0` on the card is not decoration: a flex/grid child's automatic
 * minimum is its min-content, so a long unbreakable label stretches the card
 * PAST the viewport, and an overflowing item stops being centered — which is
 * how a card ends up glued to the edge of a phone screen.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  const { ready } = useRedirectAuthenticated()

  // Outside the card on purpose: this claims the whole viewport, and the card's
  // max-width would squeeze it.
  if (!ready) return <Loading fullScreen />

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full min-w-0 max-w-md rounded-2xl border border-line2 bg-panel p-6 shadow-card sm:p-8">
        {children}
      </div>
    </main>
  )
}
