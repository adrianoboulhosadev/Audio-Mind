'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DEFAULT_SCREEN_TITLE, SCREEN_TITLES } from '../data/screen-titles'

export function useHeader() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // A detail route (/recordings/<id>) keeps its section's title instead of
  // falling back to the app name.
  const section = `/${pathname.split('/')[1] ?? ''}`
  const title = SCREEN_TITLES[pathname] ?? SCREEN_TITLES[section] ?? DEFAULT_SCREEN_TITLE

  return { title, user, logout }
}
