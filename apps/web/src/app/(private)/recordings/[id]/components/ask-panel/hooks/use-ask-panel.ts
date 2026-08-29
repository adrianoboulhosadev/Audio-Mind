'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import type { AskedAnswerDTO } from '@summary/adapters'
import { api, errorMessage } from '@/lib/api'

interface Exchange {
  question: string
  answer: string
  model: string
}

/**
 * The questions asked about this recording, in this visit.
 *
 * Nothing is stored server-side (see the backend route), so the thread lives
 * here and goes away with the screen — which is honest about what it is: a
 * conversation about the audio, not a fact about it.
 */
export function useAskPanel(recordingId: string) {
  const [question, setQuestion] = useState('')
  const [thread, setThread] = useState<Exchange[]>([])

  const ask = useMutation({
    mutationFn: async (asked: string) => {
      const { data } = await api.post<AskedAnswerDTO>(`/summary/recording/${recordingId}/ask`, {
        question: asked,
      })
      return data
    },
    // Newest first: the answer appears right under the box the question was
    // typed in, instead of at the bottom of a growing list.
    onSuccess: (data, asked) => {
      setThread((current) => [{ question: asked, ...data }, ...current])
      setQuestion('')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return {
    question,
    setQuestion,
    thread,
    asking: ask.isPending,
    submit: () => {
      const asked = question.trim()
      if (asked) ask.mutate(asked)
    },
  }
}
