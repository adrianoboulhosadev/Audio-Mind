'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { RecordingDTO, RecordingSource, UploadRecordingInput } from '@recording/adapters'
import { api, errorMessage } from '@/lib/api'
import { readAudioDuration } from '@/lib/audio-duration'

export const RECORDINGS_KEY = ['recordings']

/**
 * One search hit. The same three fields the backend composes (see its
 * SearchResult) — a type that spans two contexts has no adapters package to live
 * in, so both ends declare it from the DTO they already share.
 */
export interface SearchResult {
  recording: RecordingDTO
  excerpt: string | null
  startSeconds: number | null
}

/** Below this the search does not even leave the browser. It mirrors the guard
 * in the domain (SearchMyRecordingsQuery) — which is what actually enforces it;
 * here it only spares a request that would answer nothing. */
const MIN_SEARCH_LENGTH = 2

/** Long enough that typing a word is ONE request, short enough that the list
 * feels like it is following along. */
const SEARCH_DEBOUNCE_MS = 300

interface UploadArgs {
  title: string
  source: RecordingSource
  blob: Blob
  /** Known already when the audio was RECORDED here (we timed it); measured from
   * the file when it was picked from disk. */
  durationSeconds?: number
  filename: string
}

/**
 * The library screen's state: the list, the upload, and delete.
 *
 * The upload is two requests because the API is two routes — the bytes go up
 * first and answer with a path, then the recording is created from that path.
 * That split is what keeps the domain use case about title/format/duration
 * instead of about multipart parsing.
 */
export function useRecordings() {
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<RecordingDTO | null>(null)
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')

  // The typed value drives the input; the debounced one drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const { data: library = [], isLoading } = useQuery({
    queryKey: RECORDINGS_KEY,
    queryFn: async () => {
      const { data } = await api.get<RecordingDTO[]>('/recording')
      return data
    },
  })

  const searching = term.length >= MIN_SEARCH_LENGTH

  // The search goes to the SERVER and not over the loaded list on purpose: what
  // makes it worth having is that it reads the transcript and the summary, and
  // neither of those is in the browser.
  const { data: results = [], isFetching: searchPending } = useQuery({
    queryKey: [...RECORDINGS_KEY, 'search', term],
    enabled: searching,
    queryFn: async () => {
      const { data } = await api.get<SearchResult[]>('/recording/search', { params: { q: term } })
      return data
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: RECORDINGS_KEY })

  const upload = useMutation({
    mutationFn: async ({ title, source, blob, durationSeconds, filename }: UploadArgs) => {
      const seconds = durationSeconds ?? (await readAudioDuration(blob))

      const form = new FormData()
      form.append('file', blob, filename)
      const { data: uploaded } = await api.post<{
        url: string
        mimeType: string
        sizeBytes: number
      }>('/upload/audios', form)

      const input: UploadRecordingInput = {
        title,
        source,
        audioUrl: uploaded.url,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        durationSeconds: Math.round(seconds),
      }
      await api.post('/recording', input)
    },
    onSuccess: () => {
      // The command answers no id (commands return void), so the screen goes
      // back to the list — where the new audio is the first line, already
      // showing the pipeline it is in.
      toast.success('Áudio enviado! Vou transcrever e resumir — aviso quando terminar.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/recording/${id}`),
    onSuccess: () => {
      toast.success('Áudio excluído.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return {
    // One shape for the list either way: a plain listing simply has no excerpt.
    recordings: searching
      ? results
      : library.map((recording) => ({ recording, excerpt: null, startSeconds: null })),
    isLoading,
    search,
    setSearch,
    searching,
    // Only while there is no previous answer on screen: re-fetching the same
    // term should not blank the list the user is already reading.
    searchPending: searching && searchPending && results.length === 0,
    upload: upload.mutateAsync,
    uploading: upload.isPending,
    pendingDelete,
    askToDelete: setPendingDelete,
    cancelDelete: () => setPendingDelete(null),
    confirmDelete: () => {
      if (!pendingDelete) return
      remove.mutate(pendingDelete.id)
      setPendingDelete(null)
    },
  }
}
