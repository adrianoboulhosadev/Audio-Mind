'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

/** The jump the skip buttons make. Fifteen seconds is the length of a sentence
 * someone missed — long enough to be worth a button, short enough to not
 * overshoot the thing they were listening for. */
export const SKIP_SECONDS = 15

/**
 * A WebM recorded by the browser carries neither a duration in its header nor a
 * seek index, so no player can jump around it by asking for byte ranges — it
 * needs the whole file in hand. Everything else (mp3, m4a, wav, ogg, flac) is
 * seekable, which is what makes streaming worth it: playback starts at once and
 * clicking a line of the transcript fetches only the bytes around that moment.
 */
function needsFullDownload(mimeType: string): boolean {
  return mimeType.includes('webm')
}

/**
 * Loads the audio and drives the playback.
 *
 * It sits in the ROUTE's hooks folder, not inside the player component, because
 * two components on this screen drive the same sound: the player, and the
 * transcript, where clicking a line jumps to the second it was said. A second
 * copy of this state would be a second `<audio>` element.
 *
 * The uploads folder is deliberately not public, so the bytes always come from
 * an authenticated route — but HOW depends on the container:
 *
 * - seekable formats get a short-lived capability link (see the backend's
 *   audio-access-token) that the `<audio>` element loads by itself, with Range;
 * - a browser-recorded WebM is fetched whole by axios, with the Authorization
 *   header, and played from an object URL. Ranges would buy nothing there and
 *   would cost the scrubber, which is the worse trade.
 *
 * The `<audio>` element stays the source of truth for time and playing state;
 * this hook only mirrors what it reports. Keeping a parallel copy of "where are
 * we" is how a scrubber ends up disagreeing with the sound coming out.
 */
export function useAudioPlayer(recordingId: string, mimeType?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    // The container decides how the bytes are loaded, so there is nothing to do
    // until the recording itself has been read.
    if (!mimeType) return

    let objectUrl: string | null = null
    let active = true

    ;(async () => {
      try {
        if (needsFullDownload(mimeType)) {
          const { data } = await api.get<Blob>(`/recording/${recordingId}/audio`, {
            responseType: 'blob',
          })
          if (!active) return
          objectUrl = URL.createObjectURL(data)
          setSource(objectUrl)
          return
        }

        const { data } = await api.get<{ url: string }>(`/recording/${recordingId}/audio/link`)
        if (!active) return
        setSource(`${api.defaults.baseURL ?? ''}${data.url}`)
      } catch {
        if (active) setFailed(true)
      }
    })()

    return () => {
      active = false
      // Revoking is what actually frees the downloaded bytes — without it every
      // visit to this screen leaks another copy of the file. (Only the download
      // path creates one; the streaming path has nothing to free.)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [recordingId, mimeType])

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

  /** Jump there AND start playing — what clicking a line of the transcript
   * means. Seeking without playing would leave the user pressing play as a
   * second step, every single time. */
  const playFrom = useCallback(
    (seconds: number) => {
      seekTo(seconds)
      void audioRef.current?.play()
    },
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
    playFrom,
    skip,
    changeRate,
  }
}

/** What the player hands to the components that drive it. */
export type AudioPlayerState = ReturnType<typeof useAudioPlayer>
