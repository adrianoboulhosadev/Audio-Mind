'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { RecordingDTO } from '@recording/adapters'
import type { SummaryDTO } from '@summary/adapters'
import type { TranscriptionDTO } from '@transcription/adapters'
import { api, errorMessage } from '@/lib/api'
import { RECORDINGS_KEY } from '../../hooks/use-recordings'
import { useAudioPlayer } from './use-audio-player'

/**
 * Everything one recording's screen needs.
 *
 * The transcript and the summary are fetched only once the recording is READY:
 * asking earlier would answer 404 by design (they do not exist yet), and a
 * screen full of red errors is not how "ainda processando" should look. When the
 * pipeline finishes, the SSE ping invalidates the recordings key, this query
 * re-reads, `enabled` flips and the two panels appear — no polling anywhere.
 */
export function useRecordingDetail(recordingId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
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

  const ready = recording?.status === 'ready'

  // One player for the whole screen: the transcript drives the same sound the
  // controls do. It only starts loading once the recording is known — the
  // container is what decides whether the audio streams or is downloaded whole.
  const player = useAudioPlayer(recordingId, recording?.mimeType)

  const { data: summary } = useQuery({
    queryKey: ['summary', recordingId],
    enabled: ready,
    queryFn: async () => {
      const { data } = await api.get<SummaryDTO>(`/summary/recording/${recordingId}`)
      return data
    },
  })

  const { data: transcription } = useQuery({
    queryKey: ['transcription', recordingId],
    enabled: ready,
    queryFn: async () => {
      const { data } = await api.get<TranscriptionDTO>(`/transcription/recording/${recordingId}`)
      return data
    },
  })

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
    player,
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
