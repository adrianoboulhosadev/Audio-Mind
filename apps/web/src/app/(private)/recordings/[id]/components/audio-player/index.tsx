'use client'

import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { formatDuration } from '@/lib/format'
import { PLAYBACK_RATES } from './data/playback-rates'
import { SKIP_SECONDS, useAudioPlayer } from './hooks/use-audio-player'

/**
 * The player, drawn by us.
 *
 * It used to be a bare `<audio controls>`, which Chromium paints as a white
 * rounded bar — the one surface in an otherwise dark app that ignored the
 * palette, sitting at the top of every detail screen. Owning the controls also
 * buys what native controls do not give: skip buttons sized for finding a
 * sentence again, and playback speed, which is the feature people actually want
 * from an hour of meeting.
 *
 * The `<audio>` element is still here doing the work — just with `controls` off.
 */
export function AudioPlayer({ recordingId }: { recordingId: string }) {
  const { source, failed, playing, currentTime, duration, rate, audioProps, toggle, seekTo, skip, changeRate } =
    useAudioPlayer(recordingId)

  if (failed) return <p className="text-xs text-bad">Não consegui carregar esse áudio.</p>
  if (!source) return <p className="text-xs text-muted">Carregando o áudio…</p>

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="rounded-xl border border-line2 bg-panel2 p-3">
      <audio {...audioProps} src={source} preload="metadata" className="hidden" />

      {/* Wraps on a phone: play + skip + counter fill a 390 px row on their own,
          and the speed chips drop to a second line instead of running off the
          edge — `ml-auto` still keeps them right-aligned once they do. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pausar' : 'Reproduzir'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition hover:opacity-90"
        >
          {playing ? <Pause size={20} aria-hidden /> : <Play size={20} className="ml-0.5" aria-hidden />}
        </button>

        <IconButton
          label={`Voltar ${SKIP_SECONDS}s`}
          onClick={() => skip(-SKIP_SECONDS)}
          icon={<RotateCcw size={18} aria-hidden />}
        />
        <IconButton
          label={`Avançar ${SKIP_SECONDS}s`}
          onClick={() => skip(SKIP_SECONDS)}
          icon={<RotateCw size={18} aria-hidden />}
        />

        {/* tabular-nums so the counter does not jiggle the scrubber sideways
            every time a digit changes width. */}
        <span className="shrink-0 pl-1 text-xs tabular-nums text-muted">
          {formatDuration(currentTime)} / {duration > 0 ? formatDuration(duration) : '--:--'}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {PLAYBACK_RATES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeRate(value)}
              aria-pressed={rate === value}
              className={`rounded-md px-2 py-1 text-[11px] tabular-nums transition ${
                rate === value ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>

      {/* A range input rather than a div with a pointer handler: it is draggable,
          it is focusable, and the arrow keys already scrub. The track is painted
          with a gradient because a native progress fill cannot be themed. */}
      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(event) => seekTo(Number(event.target.value))}
          aria-label="Posição do áudio"
          disabled={duration === 0}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line2 accent-accent outline-none disabled:cursor-not-allowed [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
          style={{
            // Comes from DATA (the current position), so it cannot be a Tailwind
            // class — those are generated from source, and this number is not.
            backgroundImage: `linear-gradient(to right, var(--accent) ${progress}%, var(--line2) ${progress}%)`,
          }}
        />
      </div>
    </div>
  )
}
