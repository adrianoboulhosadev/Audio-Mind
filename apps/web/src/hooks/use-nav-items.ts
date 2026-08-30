'use client'

import { useAuth } from '@/contexts/auth-context'
import { NAV_ITEMS, type NavItem } from '@/components/sidebar/data/nav-items'

/**
 * The screens THIS person can see. Two components ask — the desktop Sidebar and
 * the mobile BottomNav — which is why it lives in `src/hooks` and not inside
 * either of them.
 *
 * Hiding the admin entry is courtesy, not security: showing a door that answers
 * 403 is just a worse way to say the same thing. What actually refuses a
 * non-admin is the guard on the backend.
 */
export function useNavItems(): NavItem[] {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
}
