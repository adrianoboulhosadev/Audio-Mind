'use client'

import type { ReactNode } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { Header } from '@/components/header'
import { Loading } from '@/components/loading'
import { Sidebar } from '@/components/sidebar'
import { useNotificationStream } from '@/hooks/use-notification-stream'
import { useProtectRoute } from '@/hooks/use-protect-route'

/**
 * The private shell: the guard, the chrome, and the ONE place the live stream is
 * opened (mounting it per screen would hold several connections open for the
 * same user).
 *
 * The navigation is two components rather than one responsive one — a column
 * from `lg` up, a bottom bar below it. They are genuinely different objects
 * (different position, different labels, different anatomy), and the one thing
 * they must agree on, the list of screens, is shared as data instead.
 *
 * There is no `AppShell` component — a wrapper whose whole job is to render two
 * siblings hides the layout from whoever opens layout.tsx looking for it.
 */
export default function PrivateLayout({ children }: { children: ReactNode }) {
  const { ready } = useProtectRoute()
  useNotificationStream()

  if (!ready) return <Loading fullScreen />

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        {/* flex-1 is what gives the default <Loading /> its height: the browser
            has already computed "screen minus header" here, which a fixed vh
            never gets right — least of all when the header wraps.
            The bottom padding is the bottom bar's own height: it is fixed, so it
            covers whatever the page ends with unless the page stops above it. */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
