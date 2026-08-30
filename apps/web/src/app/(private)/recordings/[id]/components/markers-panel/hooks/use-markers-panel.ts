'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import type { AnnotationDTO } from '@annotation/adapters'
import { api, errorMessage } from '@/lib/api'

/**
 * The marks of ONE recording.
 *
 * Adding answers nothing (CQRS), so the list is re-read and the new mark lands
 * in its place on the timeline — which is also why the list is ordered by the
 * SECOND and not by when it was created: it is a map of the audio.
 */
export function useMarkersPanel(recordingId: string) {
  const queryClient = useQueryClient()
  const key = ['annotations', recordingId]
  // Which mark is being written on right now, and what is in the box. One at a
  // time: two open editors would race for the same list.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const { data: marks = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await api.get<AnnotationDTO[]>(`/annotation/recording/${recordingId}`)
      return data
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key })
    // The library-wide screen reads the same rows.
    queryClient.invalidateQueries({ queryKey: ['annotations'] })
  }

  const add = useMutation({
    mutationFn: (atSeconds: number) =>
      api.post(`/annotation/recording/${recordingId}`, { atSeconds }),
    onSuccess: invalidate,
    onError: (error) => toast.error(errorMessage(error)),
  })

  const editNote = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.patch(`/annotation/${id}`, { note }),
    onSuccess: () => {
      setEditingId(null)
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/annotation/${id}`),
    onSuccess: invalidate,
    onError: (error) => toast.error(errorMessage(error)),
  })

  return {
    marks,
    mark: (atSeconds: number) => add.mutate(Math.floor(atSeconds)),
    marking: add.isPending,
    editingId,
    draft,
    setDraft,
    startEditing: (mark: AnnotationDTO) => {
      setEditingId(mark.id)
      setDraft(mark.note ?? '')
    },
    cancelEditing: () => setEditingId(null),
    saveNote: (id: string) => editNote.mutate({ id, note: draft }),
    remove: (id: string) => remove.mutate(id),
  }
}
