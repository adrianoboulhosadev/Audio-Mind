'use client'

import { useQuery } from '@tanstack/react-query'
import type { AnnotationDTO } from '@annotation/adapters'
import { api } from '@/lib/api'

/** One line: the mark, and which audio it points into. The same two fields the
 * backend composes (see its AnnotationItem) — a shape that spans two contexts
 * has no adapters package to live in. */
export interface MarkerItem {
  annotation: AnnotationDTO
  recordingTitle: string
}

export interface MarkerGroup {
  recordingId: string
  recordingTitle: string
  items: MarkerItem[]
}

/**
 * Every mark in the library, grouped by the audio it belongs to.
 *
 * Grouped and not flat because a mark says "second 412" — a number that means
 * nothing until you know which recording it is in. Inside a group they run in
 * the order of the AUDIO, which is how somebody reads their own marks: as a map
 * of that recording.
 */
export function useMarkers() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['annotations'],
    queryFn: async () => {
      const { data } = await api.get<MarkerItem[]>('/annotation')
      return data
    },
  })

  const byRecording = new Map<string, MarkerGroup>()
  for (const item of items) {
    const id = item.annotation.recordingId
    const group = byRecording.get(id)
    if (group) group.items.push(item)
    else
      byRecording.set(id, {
        recordingId: id,
        recordingTitle: item.recordingTitle,
        items: [item],
      })
  }

  const groups = [...byRecording.values()]
  for (const group of groups) {
    group.items.sort((first, second) => first.annotation.atSeconds - second.annotation.atSeconds)
  }

  return { groups, total: items.length, isLoading }
}
