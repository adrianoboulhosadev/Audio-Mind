'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildMindMap, type MindMapOrientation } from '@summary/adapters'
import { MIND_MAP_SECTION_TITLES } from '../data/mind-map-theme'

interface Input {
  headline: string
  topics: string[]
  actionItems: string[]
}

/** Above this the radial map fits; below it the stacked one is drawn. Matches
 * Tailwind's `lg`, which is where the app already switches its navigation. */
const WIDE_QUERY = '(min-width: 1024px)'

/**
 * The map of one summary, in the shape that fits the screen it is on.
 *
 * There is no export here on purpose: the map that somebody KEEPS is the one
 * drawn inside the PDF, as vector, next to the text it summarizes. A second
 * download of the same picture, in a worse format and on its own, was one
 * artifact too many.
 */
export function useMindMap({ headline, topics, actionItems }: Input) {
  // Starts narrow so the server render and the first client render agree —
  // matchMedia only exists after mount, and guessing wide would flash the wrong
  // layout on every phone.
  const [orientation, setOrientation] = useState<MindMapOrientation>('narrow')

  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY)
    const apply = () => setOrientation(query.matches ? 'radial' : 'narrow')
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  return useMemo(
    () =>
      buildMindMap(
        {
          headline,
          groups: [
            { tone: 'topic', title: MIND_MAP_SECTION_TITLES.topic, items: topics },
            { tone: 'action', title: MIND_MAP_SECTION_TITLES.action, items: actionItems },
          ],
        },
        { orientation },
      ),
    [headline, topics, actionItems, orientation],
  )
}
