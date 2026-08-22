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

export function useAudioRecorder(onFinish: (audio: RecordedAudio) => void) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)

  const stopTicking = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
  }, [])

  // The microphone stays on until the tracks are stopped — leaving them running
  // keeps the browser's recording indicator lit after the user is done.
  const releaseMicrophone = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      stopTicking()
      releaseMicrophone()
    }
  }, [stopTicking, releaseMicrophone])

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
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        releaseMicrophone()
        onFinish({ blob, mimeType: type, durationSeconds })
      }

      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      setSeconds(0)
      recorder.start()
      setRecording(true)
      tickRef.current = setInterval(
        () => setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000)),
        250,
      )
    } catch {
      // Denied permission and "no microphone at all" land here the same way, and
      // the user's next step is the same in both cases.
      setError('Não consegui acessar o microfone. Verifique a permissão do navegador.')
    }
  }, [onFinish, releaseMicrophone])

  const stop = useCallback(() => {
    stopTicking()
    setRecording(false)
    recorderRef.current?.stop()
  }, [stopTicking])

  return { recording, seconds, error, start, stop }
}
