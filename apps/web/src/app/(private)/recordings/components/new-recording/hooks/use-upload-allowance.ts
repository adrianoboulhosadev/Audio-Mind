'use client'

import { useQuery } from '@tanstack/react-query'
import type { AudioLimits } from '@recording/adapters'
import { api } from '@/lib/api'

interface UploadAllowance extends AudioLimits {
  mimeTypes: readonly string[]
}

/**
 * What THIS account may upload, straight from the API.
 *
 * It is fetched instead of imported because the ceiling is no longer a constant:
 * an ordinary account gets 25 MB and half an hour, an admin gets 1 GB and no
 * duration limit. The screen has to say the right number and refuse the right
 * file, and the only place that knows which is the server that resolved the
 * caller's role.
 *
 * `staleTime: Infinity` — a role changes by a hand-run UPDATE, not during a
 * session, so re-asking on every focus would be pure noise.
 */
export function useUploadAllowance() {
  const { data } = useQuery({
    queryKey: ['upload-allowance'],
    queryFn: async () => {
      const { data } = await api.get<UploadAllowance>('/upload/allowance')
      return data
    },
    staleTime: Infinity,
  })

  return data ?? null
}
