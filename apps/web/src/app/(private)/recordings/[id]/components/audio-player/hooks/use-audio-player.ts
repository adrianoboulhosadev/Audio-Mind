'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/**
 * Fetches the audio as a BLOB and plays an object URL.
 *
 * A plain `<audio src="…">` cannot be used: the file is served by an
 * authenticated route (the uploads folder is deliberately not public — see the
 * backend), and the browser sends no Authorization header for a media element.
 * So axios fetches it with the token like any other request and the player gets
 * a local URL.
 *
 * The trade-off is that the whole file downloads before playback instead of
 * streaming by range — acceptable against a 25 MB ceiling, and the price of the
 * audio not being world-readable.
 */
export function useAudioPlayer(recordingId: string) {
  const [source, setSource] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let active = true

    ;(async () => {
      try {
        const { data } = await api.get<Blob>(`/recording/${recordingId}/audio`, {
          responseType: 'blob',
        })
        if (!active) return
        objectUrl = URL.createObjectURL(data)
        setSource(objectUrl)
      } catch {
        if (active) setFailed(true)
      }
    })()

    return () => {
      active = false
      // Revoking is what actually frees the downloaded bytes — without it every
      // visit to this screen leaks another copy of the file.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [recordingId])

  return { source, failed }
}
