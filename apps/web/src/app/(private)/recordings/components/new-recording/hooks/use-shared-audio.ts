'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/** Where the service worker leaves a file shared from another app. Both sides
 * have to agree on these two strings (see public/sw.js). */
const SHARE_CACHE = 'audio-mind-shared'
const SHARED_FILE_URL = '/shared/audio'

/**
 * Picks up an audio somebody shared INTO the app from Android's share sheet.
 *
 * The file never travels through a URL or a server: the service worker received
 * the POST, put the bytes in Cache Storage and redirected here with `?shared=1`.
 * This reads them once, deletes them, and drops the file into the composer as if
 * it had been picked from disk — from there it is the upload flow that already
 * exists.
 *
 * Everything is best-effort: no service worker, no Cache Storage, a cache the
 * browser already cleared — in every case the person simply lands on the
 * composer with nothing pre-filled, which is where they were going anyway.
 */
export function useSharedAudio(onFile: (file: File) => void): void {
  const router = useRouter()
  const shared = useSearchParams().get('shared')

  useEffect(() => {
    if (!shared) return
    if (typeof caches === 'undefined') return

    let active = true

    ;(async () => {
      try {
        const cache = await caches.open(SHARE_CACHE)
        const response = await cache.match(SHARED_FILE_URL)
        if (!response) return

        // Read BEFORE deleting, and delete either way: a shared file is a
        // one-time handover, and leaving it behind would re-open the same audio
        // on the next visit.
        const blob = await response.blob()
        await cache.delete(SHARED_FILE_URL)
        if (!active) return

        const name = decodeURIComponent(response.headers.get('X-Shared-Name') ?? 'audio')
        onFile(new File([blob], name, { type: blob.type || 'audio/mpeg' }))
      } catch {
        // Nothing to hand over. The composer is empty, which is fine.
      } finally {
        // The flag has done its job; leaving it in the URL would make a reload
        // look for a file that is no longer there.
        if (active) router.replace('/recordings')
      }
    })()

    return () => {
      active = false
    }
  }, [shared, onFile, router])
}
