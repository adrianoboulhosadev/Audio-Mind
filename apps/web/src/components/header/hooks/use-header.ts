'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useRecording } from '@/hooks/use-recording'
import { DEFAULT_SCREEN_TITLE, SCREEN_TITLES } from '../data/screen-titles'
import type { Crumb } from '../types/crumb'

/**
 * Where the reader is, as a trail.
 *
 * A detail route used to print its section's name and stop, so `/recordings` and
 * `/recordings/<id>` had the exact same header — the one place on screen that
 * says where you are said nothing about being one level deeper. Now the section
 * becomes a LINK and the recording's own title is the step after it.
 *
 * The recording is read by the same key its screen uses, so this costs no extra
 * request; while it is in flight the trail is just the section, which is true
 * and stops the header from flickering a half-written path.
 */
export function useHeader() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const segments = pathname.split('/').filter(Boolean)
  const section = `/${segments[0] ?? ''}`
  const sectionTitle = SCREEN_TITLES[pathname] ?? SCREEN_TITLES[section] ?? DEFAULT_SCREEN_TITLE

  // The app's ONE detail route, named on purpose instead of "any path with two
  // segments": a trail that guessed would print a raw id the day another screen
  // grows a sub-route of its own.
  const recordingId =
    segments[0] === 'recordings' && segments.length === 2 ? segments[1] : undefined
  const { data: recording } = useRecording(recordingId)

  const crumbs: Crumb[] = recordingId
    ? [{ label: sectionTitle, href: section }, ...(recording ? [{ label: recording.title }] : [])]
    : [{ label: sectionTitle }]

  return { crumbs, user, logout }
}
