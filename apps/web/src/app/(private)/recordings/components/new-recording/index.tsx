'use client'

import { AudioRecorder } from '@/components/audio-recorder'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { formatBytes } from '@/lib/format'
import { useNewRecording } from './hooks/use-new-recording'

interface NewRecordingProps {
  upload: (args: {
    title: string
    source: 'record' | 'upload'
    blob: Blob
    durationSeconds?: number
    filename: string
  }) => Promise<unknown>
  uploading: boolean
}

/** Recording and uploading are the same act with two front doors — one panel,
 * two tabs, and the same "title + confirm" ending. */
export function NewRecording({ upload, uploading }: NewRecordingProps) {
  const { mode, switchMode, title, setTitle, audio, onRecorded, onFilePicked, submit, reset } =
    useNewRecording({ upload })

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">Novo áudio</h2>
      <p className="mt-1 text-xs text-muted">Até 25 MB e 30 minutos.</p>

      <div className="mt-4 inline-flex rounded-lg border border-line2 p-1">
        {(['record', 'upload'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => switchMode(option)}
            className={`rounded-md px-3 py-1.5 text-xs transition ${
              mode === option ? 'bg-accent text-accent-ink' : 'text-ink2 hover:text-ink'
            }`}
          >
            {option === 'record' ? 'Gravar' : 'Enviar arquivo'}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {mode === 'record' ? (
          <AudioRecorder onFinish={onRecorded} />
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line2 bg-panel2/50 px-4 py-10 text-center transition hover:border-accent">
            <span className="text-sm text-ink2">Escolher um arquivo de áudio</span>
            <span className="text-xs text-muted">mp3, m4a, wav, ogg, flac ou webm</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => onFilePicked(event.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      {audio ? (
        <div className="mt-4 flex flex-col gap-3 animate-fadeUp">
          <p className="text-xs text-muted">
            {audio.filename} · {formatBytes(audio.blob.size)}
          </p>
          <Field
            label="Título"
            placeholder="Reunião de segunda, consulta, aula…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={submit} disabled={uploading}>
              {uploading ? 'Enviando…' : 'Enviar e processar'}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={uploading}>
              Descartar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
