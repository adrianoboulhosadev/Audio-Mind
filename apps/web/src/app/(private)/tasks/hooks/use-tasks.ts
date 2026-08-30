'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import type { TaskDTO, TaskFilter } from '@task/adapters'
import { api, errorMessage } from '@/lib/api'
import { TASK_FILTERS } from '../data/task-filters'

export const TASKS_KEY = ['tasks']

/**
 * One line of the list: the task and which audio it came out of. The same two
 * fields the backend composes (see its TaskItem) — a shape that spans two
 * contexts has no adapters package to live in, so both ends declare it from the
 * DTOs they already share.
 */
export interface TaskItem {
  task: TaskDTO
  recordingTitle: string
}

/** The tasks of ONE recording, kept together. */
export interface TaskGroup {
  recordingId: string
  recordingTitle: string
  items: TaskItem[]
}

interface TaskFeed {
  pendingCount: number
  items: TaskItem[]
}

/**
 * The tasks screen's state.
 *
 * The filter is part of the QUERY KEY, not a filter applied in the browser: the
 * server already knows how to answer each slice, and "feitas" is a slice that
 * grows forever — pulling all of it down to hide most of it would get slower
 * every week.
 *
 * Ticking a box writes and re-reads, deliberately not optimistically: a line
 * vanishing from "a fazer" before the write lands looks exactly like a write
 * that failed.
 */
export function useTasks() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<TaskFilter>('pending')

  const { data, isLoading } = useQuery({
    queryKey: [...TASKS_KEY, filter],
    queryFn: async () => {
      const { data } = await api.get<TaskFeed>('/task', { params: { status: filter } })
      return data
    },
  })

  const setDone = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch(`/task/${id}`, { done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
    onError: (error) => toast.error(errorMessage(error)),
  })

  // Grouped by the audio they came out of, in the order the server sent them
  // (newest first): a flat list of sentences with no context reads like somebody
  // else's notes, and the recording is what makes each line mean something.
  const groups: TaskGroup[] = []
  for (const item of data?.items ?? []) {
    const last = groups[groups.length - 1]
    if (last?.recordingId === item.task.recordingId) last.items.push(item)
    else
      groups.push({
        recordingId: item.task.recordingId,
        recordingTitle: item.recordingTitle,
        items: [item],
      })
  }

  return {
    filters: TASK_FILTERS,
    filter,
    setFilter,
    groups,
    total: data?.items.length ?? 0,
    pendingCount: data?.pendingCount ?? 0,
    isLoading,
    toggle: (id: string, done: boolean) => setDone.mutate({ id, done }),
  }
}
