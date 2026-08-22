'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

/** Guard of the public route group: someone already signed in has no business
 * on the login screen. */
export function useRedirectAuthenticated() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/recordings')
  }, [user, loading, router])

  return { ready: !loading && !user }
}
