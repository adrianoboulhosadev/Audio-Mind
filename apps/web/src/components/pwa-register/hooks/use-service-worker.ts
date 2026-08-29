'use client'

import { useEffect } from 'react'

/**
 * Registers the offline-fallback service worker once, for the whole app.
 * Skips in dev — Fast Refresh and a live SW fight over which one serves a
 * request — and anywhere the API isn't there (older Safari, SSR).
 */
export function useServiceWorker(): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a nice-to-have, not a hard requirement — a failed
      // registration (unsupported browser, blocked storage) shouldn't be
      // surfaced to the user.
    })
  }, [])
}
