'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getAccessToken, onAccessTokenChange } from '@/lib/api'

/**
 * Holds ONE EventSource open and invalidates what a ping can affect. Mounted
 * once, in the private layout.
 *
 * It invalidates the RECORDINGS too, not just the inbox: every notification this
 * app sends is about a recording that just changed state, and without that the
 * user would get "resumo pronto" in the bell while the list next to it still
 * said "transcrevendo" until a manual reload — which is exactly the wait the
 * push exists to remove. The payload itself stays meaningless (see LiveUpdates).
 *
 * The token lives in a module variable no hook can observe, so the stream
 * subscribes to `onAccessTokenChange` and reopens itself when the token rotates.
 * There is NO manual retry: closing the EventSource is precisely what would
 * break its native reconnection.
 */
export function useNotificationStream(): void {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(getAccessToken())

  useEffect(() => onAccessTokenChange(setToken), [])

  useEffect(() => {
    if (!token) return

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
    const source = new EventSource(`${base}/notification/stream?token=${encodeURIComponent(token)}`)

    source.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['recordings'] })
    }

    return () => source.close()
  }, [token, queryClient])
}
