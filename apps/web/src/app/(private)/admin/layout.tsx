'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components/loading'
import { useAuth } from '@/contexts/auth-context'

/**
 * The admin area's own guard, in a LAYOUT and not in the page — a second admin
 * screen added later must not be able to forget it.
 *
 * The private layout above already established that somebody is logged in; this
 * one only asks whether that somebody is an administrator. It is the same
 * courtesy the hidden nav entry is: what actually refuses a non-admin is the
 * guard on the backend, and this only keeps the browser from rendering a page
 * that would answer 403.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const allowed = user?.role === 'admin'

  useEffect(() => {
    if (!loading && !allowed) router.replace('/recordings')
  }, [loading, allowed, router])

  if (loading || !allowed) return <Loading />

  return <>{children}</>
}
