'use client'

import type { RecordingKind } from '@recording/adapters'
import { AudioRecorder } from '@/components/audio-recorder'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { SelectField } from '@/components/select-field'
import { FileUpload } from '@/components/file-upload'
import { RECORDING_KIND_HINTS, RECORDING_KIND_LABELS } from '@/data/recording-kinds'
import { formatBytes } from '@/lib/format'
import { useNewRecording } from './hooks/use-new-recording'

interface NewRecordingProps {
  upload: (args: {
    title: string
    kind: RecordingKind
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
  const {
    mode,
    switchMode,
    title,
    setTitle,
    kind,
    setKind,
    audio,
    allowance,
    onRecorded,
    onFilePicked,
    submit,
    reset,
  } = useNewRecording({ upload })

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">Novo áudio</h2>
      {/* The account's OWN limits, not a constant: an admin reads "até 1 GB"
          here because that is what the server will actually accept from them. */}
      <p className="mt-1 text-xs text-muted">{describeAllowance(allowance)}</p>

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
          <FileUpload
            accept="audio/*"
            file={audio?.blob instanceof File ? audio.blob : null}
            onChange={onFilePicked}
            hint="mp3, m4a, wav, ogg, flac ou webm"
          />
        )}
      </div>

      {audio ? (
        <div className="mt-4 flex flex-col gap-3 animate-fadeUp">
          {/* The file card in FileUpload already names the picked file; a
              recording has no card, so it says its own size here. */}
          {audio.source === 'record' ? (
            <p className="text-xs text-muted">
              {audio.filename} · {formatBytes(audio.blob.size)}
            </p>
          ) : null}
          <Field
            label="Título"
            placeholder="Reunião de segunda, consulta, aula…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          {/* O tipo muda o PROMPT do resumo, não a aparência da tela: uma aula
              devolve conceitos e o que estudar, uma consulta devolve medicação e
              retorno. Daí a dica embaixo — sem ela "Aula" é só uma palavra. */}
          <SelectField
            label="Tipo de áudio"
            value={kind}
            onChange={(event) => setKind(event.target.value as RecordingKind)}
            options={Object.entries(RECORDING_KIND_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            hint={RECORDING_KIND_HINTS[kind]}
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

/**
 * Pure formatting of the two ceilings, so the JSX above stays JSX. `null` while
 * the allowance is still loading — a placeholder number would be a promise the
 * server has not made yet.
 */
function describeAllowance(
  allowance: { maxSizeBytes: number; maxDurationSeconds: number | null } | null,
): string {
  if (!allowance) return 'Carregando os limites da sua conta…'

  const size = formatBytes(allowance.maxSizeBytes)
  // Minutes, not the mm:ss clock formatDuration produces: "30:00" is a
  // position in a track, and this is a budget.
  return allowance.maxDurationSeconds
    ? `Até ${size} e ${Math.round(allowance.maxDurationSeconds / 60)} minutos.`
    : `Até ${size}, sem limite de duração.`
}
