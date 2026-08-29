'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { RecordingDTO } from '@recording/adapters'
import type { SummaryDTO } from '@summary/adapters'
import type { TranscriptionDTO } from '@transcription/adapters'
import { api, errorMessage, isNotFound } from '@/lib/api'
import { RECORDINGS_KEY } from '../../hooks/use-recordings'
import { useAudioPlayer } from './use-audio-player'

/**
 * Everything one recording's screen needs.
 *
 * The transcript and the summary are read whatever the status is, and a 404
 * (they do not exist yet) is an ABSENCE, not an error — a screen full of red
 * boxes is not how "ainda processando" should look. Fetching them regardless is
 * what keeps the panels on screen while a READY recording is being processed
 * again: the previous summary is still stored and still true until the new one
 * replaces it, and blanking the page for a minute would be losing something the
 * user already had.
 *
 * The recording's `updatedAt` is part of their key, so every transition the
 * pipeline writes re-reads them — and `placeholderData` keeps the previous
 * answer on screen while that happens, instead of a flash of nothing. When the
 * pipeline finishes, the SSE ping invalidates the recordings key, this query
 * re-reads, the stamp changes and the panels swap to the new content. No polling
 * anywhere.
 */
export function useRecordingDetail(recordingId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  // `?t=` is how a search result hands over the moment it found: the player
  // starts there and the transcript opens on it.
  const startAt = Number(useSearchParams().get('t'))
  const startAtSeconds = Number.isFinite(startAt) && startAt > 0 ? startAt : undefined
  const [title, setTitle] = useState('')
  // Reprocessing a recording that is READY throws away a transcript and a
  // summary that exist and work, so it goes through a confirmation — unlike
  // retrying one that failed, where there is nothing to lose.
  const [confirmingReprocess, setConfirmingReprocess] = useState(false)

  const { data: recording, isLoading } = useQuery({
    queryKey: [...RECORDINGS_KEY, recordingId],
    queryFn: async () => {
      const { data } = await api.get<RecordingDTO>(`/recording/${recordingId}`)
      return data
    },
  })

  // Bumped by every transition the pipeline writes (the entity touches it), so
  // it is what tells the derived queries "there may be something new".
  const stamp = recording?.updatedAt

  // One player for the whole screen: the transcript drives the same sound the
  // controls do. It only starts loading once the recording is known — the
  // container is what decides whether the audio streams or is downloaded whole.
  const player = useAudioPlayer(recordingId, recording?.mimeType, startAtSeconds)

  const { data: summary } = useQuery({
    queryKey: ['summary', recordingId, stamp],
    enabled: !!recording,
    // A missing summary is a state of the recording, not a failure of the
    // request — so it is cached as "none" instead of retried.
    retry: false,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      try {
        const { data } = await api.get<SummaryDTO>(`/summary/recording/${recordingId}`)
        return data
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
  })

  const { data: transcription } = useQuery({
    queryKey: ['transcription', recordingId, stamp],
    enabled: !!recording,
    retry: false,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      try {
        const { data } = await api.get<TranscriptionDTO>(`/transcription/recording/${recordingId}`)
        return data
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
  })

  // Being processed with something already on screen: the panels below are the
  // PREVIOUS run's, and the screen has to say so instead of passing them off as
  // the current ones.
  const refreshing =
    recording?.status !== 'ready' &&
    recording?.status !== 'failed' &&
    Boolean(summary || transcription)

  // The input starts from the stored title, and follows it when the recording
  // is re-read (a rename elsewhere, a fresh load).
  useEffect(() => {
    if (recording) setTitle(recording.title)
  }, [recording])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: RECORDINGS_KEY })

  const rename = useMutation({
    mutationFn: (newTitle: string) => api.patch(`/recording/${recordingId}`, { title: newTitle }),
    onSuccess: () => {
      toast.success('Título atualizado.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const retry = useMutation({
    mutationFn: () => api.post(`/recording/${recordingId}/retry`),
    onSuccess: () => {
      toast.success('Mandei processar de novo. Aviso quando terminar.')
      setConfirmingReprocess(false)
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/recording/${recordingId}`),
    onSuccess: () => {
      toast.success('Áudio excluído.')
      invalidate()
      router.replace('/recordings')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return {
    recording,
    summary,
    transcription,
    refreshing,
    player,
    startAtSeconds,
    isLoading,
    title,
    setTitle,
    rename: () => rename.mutate(title.trim()),
    renaming: rename.isPending,
    retry: () => retry.mutate(),
    retrying: retry.isPending,
    confirmingReprocess,
    askToReprocess: () => setConfirmingReprocess(true),
    cancelReprocess: () => setConfirmingReprocess(false),
    remove: () => remove.mutate(),
  }
}
