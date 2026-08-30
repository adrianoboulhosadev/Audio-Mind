'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ShareLinkDTO, ShareWindow } from '@sharing/adapters'
import { api, errorMessage } from '@/lib/api'

/**
 * The owner's side of sharing, for ONE recording.
 *
 * Creating answers nothing (the command returns void, like every other command
 * here), so the list is re-read and the new link is the first row — with its
 * copy button, which is the only place the token is ever shown.
 */
export function useSharePanel(recordingId: string) {
  const queryClient = useQueryClient()
  const key = ['share-links', recordingId]
  const [window, setWindow] = useState<ShareWindow>('7d')
  const [includesTranscript, setIncludesTranscript] = useState(false)
  const [includesAudio, setIncludesAudio] = useState(false)

  const { data: links = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await api.get<ShareLinkDTO[]>('/share', { params: { recordingId } })
      return data
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: () =>
      api.post(`/share/recording/${recordingId}`, {
        window,
        includesTranscript,
        includesAudio,
      }),
    onSuccess: () => {
      toast.success('Link criado. Copie e mande pra quem precisa ver.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/share/${id}`),
    onSuccess: () => {
      toast.success('Link desativado. Quem tiver o endereço não abre mais.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return {
    links,
    isLoading,
    window,
    setWindow,
    includesTranscript,
    setIncludesTranscript,
    includesAudio,
    setIncludesAudio,
    create: () => create.mutate(),
    creating: create.isPending,
    revoke: (id: string) => revoke.mutate(id),
    urlFor: (token: string) => `${location.origin}/s/${token}`,
    copy: async (token: string) => {
      const url = `${location.origin}/s/${token}`
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Link copiado.')
      } catch {
        // Clipboard access can be refused (an insecure origin, a permission the
        // user said no to). The address is on screen anyway, so this says what
        // to do instead of failing silently.
        toast.error('Não consegui copiar. Selecione o endereço e copie na mão.')
      }
    },
  }
}
