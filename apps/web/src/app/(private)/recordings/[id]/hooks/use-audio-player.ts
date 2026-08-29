'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

/** The jump the skip buttons make. Fifteen seconds is the length of a sentence
 * someone missed — long enough to be worth a button, short enough to not
 * overshoot the thing they were listening for. */
export const SKIP_SECONDS = 15

/**
 * Fetches the audio as a BLOB and drives the playback.
 *
 * A plain `<audio src="…">` cannot be used: the file is served by an
 * authenticated route (the uploads folder is deliberately not public — see the
 * backend), and the browser sends no Authorization header for a media element.
 * So axios fetches it with the token like any other request and the player gets
 * a local URL.
 *
 * The trade-off is that the whole file downloads before playback instead of
 * streaming by range — the price of the audio not being world-readable.
 *
 * The `<audio>` element stays the source of truth for time and playing state;
 * this hook only mirrors what it reports. Keeping a parallel copy of "where are
 * we" is how a scrubber ends up disagreeing with the sound coming out.
 */
export function useAudioPlayer(recordingId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    let objectUrl: string | null = null
    let active = true

    ;(async () => {
      try {
        const { data } = await api.get<Blob>(`/recording/${recordingId}/audio`, {
          responseType: 'blob',
        })
        if (!active) return
        objectUrl = URL.createObjectURL(data)
        setSource(objectUrl)
      } catch {
        if (active) setFailed(true)
      }
    })()

    return () => {
      active = false
      // Revoking is what actually frees the downloaded bytes — without it every
      // visit to this screen leaks another copy of the file.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [recordingId])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.min(Math.max(seconds, 0), audio.duration)
    // Mirrored immediately so dragging the scrubber feels attached to the
    // pointer instead of waiting for the next timeupdate.
    setCurrentTime(audio.currentTime)
  }, [])

  const skip = useCallback(
    (seconds: number) => seekTo((audioRef.current?.currentTime ?? 0) + seconds),
    [seekTo],
  )

  const changeRate = useCallback((value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = value
    setRate(value)
  }, [])

  /** Everything the <audio> element reports, in one place to spread onto it. */
  const audioProps = {
    ref: audioRef,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: (event: { currentTarget: HTMLAudioElement }) =>
      setCurrentTime(event.currentTarget.currentTime),
    // A WebM from MediaRecorder carries no duration in its header, so the
    // element reports Infinity until it has seen the whole stream. Reading it on
    // `durationchange` too is what eventually gets the real number.
    onLoadedMetadata: (event: { currentTarget: HTMLAudioElement }) =>
      setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0),
    onDurationChange: (event: { currentTarget: HTMLAudioElement }) =>
      setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0),
    onError: () => setFailed(true),
  }

  return {
    source,
    failed,
    playing,
    currentTime,
    duration,
    rate,
    audioProps,
    toggle,
    seekTo,
    skip,
    changeRate,
  }
}
