'use client'

import { usePathname } from 'next/navigation'

/**
 * Which nav item the current route belongs to. Lives in `src/hooks` because TWO
 * components ask — the desktop Sidebar and the mobile BottomNav — and a detail
 * route has to light up its section: `/recordings/<id>` is still "Meus áudios".
 */
export function useActiveNav() {
  const pathname = usePathname()

  return (href: string) => pathname === href || pathname.startsWith(`${href}/`)
}
