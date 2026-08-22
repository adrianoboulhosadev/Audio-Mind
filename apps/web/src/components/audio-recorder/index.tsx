'use client'

import { Button } from '@/components/button'
import { formatDuration } from '@/lib/format'
import { useAudioRecorder, type RecordedAudio } from './hooks/use-audio-recorder'

/** Recording in the browser. What comes out is the same thing an upload
 * produces — a blob with a type and a duration — so the screen above it treats
 * both the same way. */
export function AudioRecorder({ onFinish }: { onFinish: (audio: RecordedAudio) => void }) {
  const { recording, seconds, error, start, stop } = useAudioRecorder(onFinish)

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line2 bg-panel2/50 px-4 py-8">
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-label={recording ? 'Parar gravação' : 'Começar a gravar'}
        className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition ${
          recording
            ? 'animate-pulseRing border-bad bg-bad/15 text-bad'
            : 'border-accent bg-accent-soft text-accent hover:brightness-125'
        }`}
      >
        {recording ? (
          <span className="h-6 w-6 rounded bg-current" />
        ) : (
          <span className="h-7 w-7 rounded-full bg-current" />
        )}
      </button>

      <span className="font-mono text-2xl tabular-nums text-ink">{formatDuration(seconds)}</span>
      <p className="text-center text-xs text-muted">
        {recording ? 'Gravando… toque no quadrado para parar.' : 'Toque no círculo para gravar.'}
      </p>

      {error ? <p className="text-center text-xs text-bad">{error}</p> : null}
      {recording ? (
        <Button variant="ghost" onClick={stop}>
          Parar e usar essa gravação
        </Button>
      ) : null}
    </div>
  )
}
