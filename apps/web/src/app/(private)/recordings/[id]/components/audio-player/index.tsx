'use client'

import { useAudioPlayer } from './hooks/use-audio-player'

export function AudioPlayer({ recordingId }: { recordingId: string }) {
  const { source, failed } = useAudioPlayer(recordingId)

  if (failed) return <p className="text-xs text-bad">Não consegui carregar esse áudio.</p>
  if (!source) return <p className="text-xs text-muted">Carregando o áudio…</p>

  return <audio controls src={source} className="w-full" />
}
