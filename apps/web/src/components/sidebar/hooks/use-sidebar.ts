'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useMobileNav } from '@/contexts/mobile-nav-context'

/**
 * The drawer's behavior. It closes on Escape and on every navigation: staying
 * covered by a full-screen drawer after tapping a link is not a state anyone
 * wants to be in.
 */
export function useSidebar() {
  const pathname = usePathname()
  const { open, close } = useMobileNav()

  useEffect(() => {
    close()
    // Only on a route change — closing whenever `close` re-identifies would
    // fight the button that just opened it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return { open, close, isActive }
}
