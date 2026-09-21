'use client'

import { useQuery } from '@tanstack/react-query'
import type { RecordingDTO } from '@recording/adapters'
import { RECORDINGS_KEY } from '@/data/query-keys'
import { api } from '@/lib/api'

/**
 * One recording, by id.
 *
 * Shared because TWO things need it: the screen itself and the header's trail,
 * which names the recording the reader is inside of. Same key, so TanStack
 * serves both from one cache entry and one request — the header does not pay
 * for a second GET to print a title the page is already fetching.
 *
 * `enabled` is what keeps it inert everywhere else: the header is mounted on
 * every private screen, and most of them are not a recording.
 */
export function useRecording(recordingId?: string) {
  return useQuery({
    queryKey: [...RECORDINGS_KEY, recordingId],
    queryFn: async () => {
      const { data } = await api.get<RecordingDTO>(`/recording/${recordingId}`)
      return data
    },
    enabled: Boolean(recordingId),
  })
}
