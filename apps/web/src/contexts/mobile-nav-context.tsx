'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

/**
 * Whether the mobile navigation drawer is open. It lives in a context because
 * the BUTTON that opens it is in the Header and the DRAWER is the Sidebar —
 * two siblings the private layout mounts side by side, with no component
 * owning both.
 */
interface MobileNav {
  open: boolean
  toggle: () => void
  close: () => void
}

const MobileNavContext = createContext<MobileNav | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => setOpen((current) => !current), [])
  const close = useCallback(() => setOpen(false), [])

  return (
    <MobileNavContext.Provider value={{ open, toggle, close }}>{children}</MobileNavContext.Provider>
  )
}

export function useMobileNav(): MobileNav {
  const context = useContext(MobileNavContext)
  if (!context) throw new Error('useMobileNav must be used inside MobileNavProvider')
  return context
}
