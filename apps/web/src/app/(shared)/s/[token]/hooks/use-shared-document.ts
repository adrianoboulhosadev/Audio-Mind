'use client'

import { useQuery } from '@tanstack/react-query'
import { api, errorCode } from '@/lib/api'

/** What the backend hands a visitor (see its SharedDocument): no owner, no ids,
 * no model name — one document and nothing that addresses anything else. */
export interface SharedDocument {
  recording: {
    title: string
    kind: string
    durationSeconds: number
    createdAt: string
  }
  summary: {
    headline: string
    overview: string
    topics: string[]
    actionItems: string[]
    createdAt: string
  }
  transcript: { text: string; segments: { startSeconds: number; text: string }[] } | null
  audioUrl: string | null
  expiresAt: string
}

/**
 * Reads a shared document by the token in the URL.
 *
 * `retry: false` because every failure here is a final answer about the LINK
 * (unknown, expired, revoked, or a summary that is not ready), never a hiccup
 * worth trying again — and the page has a different sentence for each, which is
 * why it keeps the domain code instead of a generic message.
 */
export function useSharedDocument(token: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shared', token],
    retry: false,
    queryFn: async () => {
      const { data } = await api.get<SharedDocument>(`/share/public/${token}`)
      return data
    },
  })

  return {
    document: data,
    isLoading,
    // The API base URL, because the audio path the backend hands over is
    // relative to the BACKEND, not to this site.
    apiBaseUrl: api.defaults.baseURL ?? '',
    failure: error ? errorCode(error) : null,
  }
}
