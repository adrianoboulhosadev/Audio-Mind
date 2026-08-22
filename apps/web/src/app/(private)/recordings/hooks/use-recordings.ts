'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import type { RecordingDTO, RecordingSource, UploadRecordingInput } from '@recording/adapters'
import { api, errorMessage } from '@/lib/api'
import { readAudioDuration } from '@/lib/audio-duration'

export const RECORDINGS_KEY = ['recordings']

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

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: RECORDINGS_KEY,
    queryFn: async () => {
      const { data } = await api.get<RecordingDTO[]>('/recording')
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
    recordings,
    isLoading,
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
