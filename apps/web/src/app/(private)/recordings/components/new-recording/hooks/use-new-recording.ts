'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AudioFile, type RecordingSource } from '@recording/adapters'
import type { RecordedAudio } from '@/components/audio-recorder/hooks/use-audio-recorder'

interface PickedAudio {
  blob: Blob
  filename: string
  source: RecordingSource
  /** Only a RECORDED audio arrives with its duration already known. */
  durationSeconds?: number
}

interface UseNewRecordingArgs {
  upload: (args: {
    title: string
    source: RecordingSource
    blob: Blob
    durationSeconds?: number
    filename: string
  }) => Promise<unknown>
}

/**
 * The composer's state: which tab, which audio, which title.
 *
 * The size check happens HERE as well as in the domain on purpose — the point is
 * to say "esse arquivo passa de 25 MB" before spending the upload, not to be the
 * rule. The rule is the AudioFile value object, and the constant comes from it
 * (re-exported by @recording/adapters), so the two can never disagree.
 */
export function useNewRecording({ upload }: UseNewRecordingArgs) {
  const [mode, setMode] = useState<RecordingSource>('record')
  const [title, setTitle] = useState('')
  const [audio, setAudio] = useState<PickedAudio | null>(null)

  const onRecorded = useCallback((recorded: RecordedAudio) => {
    setAudio({
      blob: recorded.blob,
      // The extension matters: the backend stores the file as uuid + extname, so
      // a name without one would write a lying extension.
      filename: recorded.mimeType.includes('mp4') ? 'gravacao.mp4' : 'gravacao.webm',
      source: 'record',
      durationSeconds: recorded.durationSeconds,
    })
  }, [])

  const onFilePicked = useCallback((file: File | null) => {
    if (!file) return setAudio(null)

    if (file.size > AudioFile.MAX_SIZE_BYTES) {
      toast.error('Esse arquivo passa de 25 MB.')
      return
    }

    setAudio({ blob: file, filename: file.name, source: 'upload' })
    setTitle((current) => current || file.name.replace(/\.[^.]+$/, ''))
  }, [])

  const reset = useCallback(() => {
    setAudio(null)
    setTitle('')
  }, [])

  const submit = useCallback(async () => {
    if (!audio) return
    await upload({
      title: title.trim() || 'Áudio sem título',
      source: audio.source,
      blob: audio.blob,
      durationSeconds: audio.durationSeconds,
      filename: audio.filename,
    })
    reset()
  }, [audio, title, upload, reset])

  const switchMode = useCallback((next: RecordingSource) => {
    setMode(next)
    setAudio(null)
  }, [])

  return { mode, switchMode, title, setTitle, audio, onRecorded, onFilePicked, submit, reset }
}
