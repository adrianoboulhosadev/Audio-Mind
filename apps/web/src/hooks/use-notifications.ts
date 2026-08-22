'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationFeedDTO } from '@notification/adapters'
import { api } from '@/lib/api'

export const NOTIFICATIONS_KEY = ['notifications']

/**
 * The inbox, shared by the bell and the notifications page — both read the SAME
 * feed shape, the bell just asks for fewer items.
 *
 * NO `refetchInterval` anywhere: what makes this list update is the SSE ping
 * invalidating the key (see useNotificationStream). Polling would be a second,
 * worse copy of that.
 */
export function useNotifications(limit?: number) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, limit ?? 'default'],
    queryFn: async () => {
      const { data } = await api.get<NotificationFeedDTO>('/notification', { params: { limit } })
      return data
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.post(`/notification/${id}/read`),
    onSuccess: invalidate,
  })

  const markAllAsRead = useMutation({
    mutationFn: () => api.post('/notification/read-all'),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/notification/${id}`),
    onSuccess: invalidate,
  })

  const clearAll = useMutation({
    mutationFn: () => api.delete('/notification'),
    onSuccess: invalidate,
  })

  return {
    items: data?.items ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    remove: remove.mutate,
    clearAll: clearAll.mutate,
  }
}
