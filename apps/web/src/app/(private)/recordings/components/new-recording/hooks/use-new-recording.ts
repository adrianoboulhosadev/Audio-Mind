'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { RecordingSource } from '@recording/adapters'
import type { RecordedAudio } from '@/components/audio-recorder/hooks/use-audio-recorder'
import { formatBytes } from '@/lib/format'
import { useUploadAllowance } from './use-upload-allowance'

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
 * to say "esse arquivo passa do seu limite" before spending the upload, not to
 * be the rule. The rule is the AudioFile value object; the NUMBER comes from
 * GET /upload/allowance, which is the same value object answering for this
 * caller's role — so the UI can never promise what the domain refuses.
 */
export function useNewRecording({ upload }: UseNewRecordingArgs) {
  const allowance = useUploadAllowance()
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

    // No allowance loaded yet means the request is still in flight; letting the
    // file through is safe, because the server refuses it either way.
    if (allowance && file.size > allowance.maxSizeBytes) {
      toast.error(`Esse arquivo passa do seu limite de ${formatBytes(allowance.maxSizeBytes)}.`)
      return
    }

    setAudio({ blob: file, filename: file.name, source: 'upload' })
    setTitle((current) => current || file.name.replace(/\.[^.]+$/, ''))
  }, [allowance])

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

  return {
    mode,
    switchMode,
    title,
    setTitle,
    audio,
    allowance,
    onRecorded,
    onFilePicked,
    submit,
    reset,
  }
}
