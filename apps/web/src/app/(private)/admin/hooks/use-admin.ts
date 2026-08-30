'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { UserDTO, UserStatsDTO } from '@auth/adapters'
import type { LibraryStatsDTO, RecordingDTO } from '@recording/adapters'
import { api, errorMessage } from '@/lib/api'

interface UploadsUsage {
  audios: { files: number; bytes: number }
  summaries: { files: number; bytes: number }
  totalBytes: number
}

export interface AdminOverview {
  users: UserStatsDTO
  library: LibraryStatsDTO
  disk: UploadsUsage
  failed: RecordingDTO[]
}

export interface AdminUserRow {
  user: UserDTO
  recordings: number
  storageBytes: number
}

const SEARCH_DEBOUNCE_MS = 300

/**
 * The admin screen's state: the overview, the user list, and the two things an
 * administrator can change about somebody else.
 *
 * Both writes re-read rather than patching the cache: the row's role and its
 * active flag are what the server decided (it refuses acting on yourself), so
 * showing anything before it answered would be guessing.
 */
export function useAdmin() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const { data } = await api.get<AdminOverview>('/admin/overview')
      return data
    },
  })

  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users', term],
    queryFn: async () => {
      const { data } = await api.get<AdminUserRow[]>('/admin/users', { params: { q: term } })
      return data
    },
  })

  const setAccess = useMutation({
    mutationFn: ({ id, ...body }: { id: string; role?: string; active?: boolean }) =>
      api.patch(`/admin/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return {
    overview,
    users,
    isLoading,
    search,
    setSearch,
    setRole: (id: string, role: 'user' | 'admin') => setAccess.mutate({ id, role }),
    setActive: (id: string, active: boolean) => setAccess.mutate({ id, active }),
    saving: setAccess.isPending,
  }
}
