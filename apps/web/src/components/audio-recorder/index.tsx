'use client'

import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/button'
import { formatDuration } from '@/lib/format'
import { useAudioRecorder, type RecordedAudio } from './hooks/use-audio-recorder'

/** Recording in the browser. What comes out is the same thing an upload
 * produces — a blob with a type and a duration — so the screen above it treats
 * both the same way. */
export function AudioRecorder({ onFinish }: { onFinish: (audio: RecordedAudio) => void }) {
  const { recording, paused, seconds, error, start, stop, togglePause } =
    useAudioRecorder(onFinish)

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line2 bg-panel2/50 px-4 py-8">
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-label={recording ? 'Parar gravação' : 'Começar a gravar'}
        className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition ${
          recording
            ? // Pausado NÃO pulsa: o anel pulsando é o que diz "estou captando",
              // e mantê-lo aceso durante a pausa seria a única coisa na tela
              // mentindo sobre o que o microfone está fazendo.
              `border-bad bg-bad/15 text-bad ${paused ? '' : 'animate-pulseRing'}`
            : 'border-accent bg-accent-soft text-accent hover:brightness-125'
        }`}
      >
        {recording ? (
          <span className="h-6 w-6 rounded bg-current" />
        ) : (
          <span className="h-7 w-7 rounded-full bg-current" />
        )}
      </button>

      {/* O cronômetro conta só o que foi REALMENTE gravado: o tempo parado não
          entra, senão a duração guardada mentiria sobre um arquivo mais curto
          que ela. */}
      <span className="font-mono text-2xl tabular-nums text-ink">{formatDuration(seconds)}</span>
      <p className="text-center text-xs text-muted">
        {!recording
          ? 'Toque no círculo para gravar.'
          : paused
            ? 'Pausado. O tempo parado não entra na gravação.'
            : 'Gravando… toque no quadrado para parar.'}
      </p>

      {error ? <p className="text-center text-xs text-bad">{error}</p> : null}
      {recording ? (
        <div className="flex flex-wrap justify-center gap-2">
          {/* Uma reunião de uma hora tem intervalo: sem isso, a escolha era
              gravar o corredor ou terminar com dois arquivos. */}
          <Button variant="ghost" onClick={togglePause}>
            {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
            {paused ? 'Retomar' : 'Pausar'}
          </Button>
          <Button variant="ghost" onClick={stop}>
            Parar e usar essa gravação
          </Button>
        </div>
      ) : null}
    </div>
  )
}
