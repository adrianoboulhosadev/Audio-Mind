'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface RecordedAudio {
  blob: Blob
  mimeType: string
  /** Measured by the CLOCK, not read from the file: a WebM from MediaRecorder
   * has no duration in its header (see lib/audio-duration.ts). Since we were
   * here the whole time, counting is both simpler and exact. */
  durationSeconds: number
}

/** Ordered by preference. The browser picks the first it can actually produce —
 * Chrome/Firefox give WebM/Opus, Safari gives MP4/AAC — and all of them are on
 * the domain's supported list. */
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

/**
 * Keeps the screen awake while recording.
 *
 * Not a nicety: on a phone, the screen turning itself off suspends the page, and
 * a suspended page stops feeding the MediaRecorder — which is exactly what
 * happens when someone puts the phone face down on the table for a 40-minute
 * meeting. The lock is released as soon as the recording stops, and everything
 * here is best-effort: the API does not exist on every browser (Safari got it
 * late, Firefox does not have it), and a recording that cannot hold the screen
 * is still a recording.
 */
async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    return (await navigator.wakeLock?.request('screen')) ?? null
  } catch {
    // Denied, or the tab was already in the background: nothing to do about it.
    return null
  }
}

export function useAudioRecorder(onFinish: (audio: RecordedAudio) => void) {
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  /** When the CURRENT running stretch started. Reset on every resume. */
  const startedAtRef = useRef(0)
  /**
   * How much was recorded BEFORE the current stretch.
   *
   * This is the whole reason pausing needs care: the clock is what measures the
   * duration (a WebM from MediaRecorder carries none), but a paused recorder
   * writes no audio — so wall-clock time would count the coffee break and the
   * stored duration would be a lie about a file that is shorter than it claims.
   * Adding up only the running stretches is what keeps the number equal to the
   * file.
   */
  const recordedMsRef = useRef(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  /** Milliseconds actually recorded so far: what is banked, plus the stretch
   * that is running right now. */
  const elapsedMs = useCallback(
    () => recordedMsRef.current + (startedAtRef.current ? Date.now() - startedAtRef.current : 0),
    [],
  )

  const stopTicking = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
  }, [])

  const startTicking = useCallback(() => {
    stopTicking()
    tickRef.current = setInterval(() => setSeconds(Math.round(elapsedMs() / 1000)), 250)
  }, [stopTicking, elapsedMs])

  // The microphone stays on until the tracks are stopped — leaving them running
  // keeps the browser's recording indicator lit after the user is done.
  const releaseMicrophone = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
  }, [])

  const releaseWakeLock = useCallback(() => {
    void wakeLockRef.current?.release().catch(() => undefined)
    wakeLockRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      stopTicking()
      releaseMicrophone()
      releaseWakeLock()
    }
  }, [stopTicking, releaseMicrophone, releaseWakeLock])

  // The lock dies whenever the tab is hidden, and the browser does not give it
  // back on its own — so a person who checks a message mid-meeting would come
  // back to a screen free to sleep again. Re-taking it on every return is what
  // keeps the recording alive across that.
  useEffect(() => {
    if (!recording) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void requestWakeLock().then((sentinel) => {
        if (sentinel) wakeLockRef.current = sentinel
      })
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [recording])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const durationSeconds = Math.max(1, Math.round(elapsedMs() / 1000))
        releaseMicrophone()
        releaseWakeLock()
        onFinish({ blob, mimeType: type, durationSeconds })
      }

      wakeLockRef.current = await requestWakeLock()
      recorderRef.current = recorder
      recordedMsRef.current = 0
      startedAtRef.current = Date.now()
      setSeconds(0)
      recorder.start()
      setRecording(true)
      setPaused(false)
      startTicking()
    } catch {
      // Denied permission and "no microphone at all" land here the same way, and
      // the user's next step is the same in both cases.
      setError('Não consegui acessar o microfone. Verifique a permissão do navegador.')
    }
  }, [onFinish, releaseMicrophone, releaseWakeLock, startTicking, elapsedMs])

  const stop = useCallback(() => {
    stopTicking()
    // Bank the stretch that was running, so the duration handed over counts it.
    recordedMsRef.current = elapsedMs()
    startedAtRef.current = 0
    setRecording(false)
    setPaused(false)
    recorderRef.current?.stop()
  }, [stopTicking, elapsedMs])

  /**
   * Pauses and resumes. An hour-long meeting has a break in it, and without this
   * the choice was to keep recording the corridor or to end up with two files.
   *
   * The microphone and the wake lock stay held while paused: the stream is still
   * open and the recorder still holds what was captured so far, so letting the
   * screen sleep here would risk the page being suspended mid-recording — the
   * exact failure the wake lock exists to prevent.
   */
  const togglePause = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return

    if (recorder.state === 'recording') {
      recorder.pause()
      stopTicking()
      recordedMsRef.current = elapsedMs()
      startedAtRef.current = 0
      setPaused(true)
      return
    }

    if (recorder.state === 'paused') {
      recorder.resume()
      startedAtRef.current = Date.now()
      setPaused(false)
      startTicking()
    }
  }, [stopTicking, startTicking, elapsedMs])

  return { recording, paused, seconds, error, start, stop, togglePause }
}
