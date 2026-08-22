'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

/** Guard of the private route group. Lives in the group's layout, never per
 * page — a page that forgets it would be a hole. */
export function useProtectRoute() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  return { ready: !loading && !!user }
}
