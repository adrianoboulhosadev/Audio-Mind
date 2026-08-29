'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Field } from '@/components/field'
import { IconButton } from '@/components/icon-button'
import { Loading } from '@/components/loading'
import { StatusBadge } from '@/components/status-badge'
import { formatBytes, formatDateTime, formatDuration } from '@/lib/format'
import { AskPanel } from './components/ask-panel'
import { AudioPlayer } from './components/audio-player'
import { SummaryPanel } from './components/summary-panel'
import { TranscriptPanel } from './components/transcript-panel'
import { useRecordingDetail } from './hooks/use-recording-detail'

export default function RecordingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const {
    recording,
    summary,
    transcription,
    refreshing,
    player,
    startAtSeconds,
    isLoading,
    title,
    setTitle,
    rename,
    renaming,
    retry,
    retrying,
    confirmingReprocess,
    askToReprocess,
    cancelReprocess,
  } = useRecordingDetail(id)

  if (isLoading) return <Loading />

  if (!recording) {
    return (
      <p className="text-center text-sm text-muted">
        Gravação não encontrada.{' '}
        <Link href="/recordings" className="text-accent hover:underline">
          Voltar
        </Link>
      </p>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Just the arrow, at a size a thumb can hit: the screen the user came
          from is already named by the header above it, so repeating "meus
          áudios" here only crowded the top of a phone. The words stay reachable
          as the label and the tooltip. */}
      <IconButton
        href="/recordings"
        label="Voltar para meus áudios"
        icon={<ArrowLeft size={28} aria-hidden />}
        className="-ml-2"
      />

      <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">
            {recording.title}
          </h2>
          <StatusBadge status={recording.status} />
        </div>

        <p className="mt-1 text-xs text-muted">
          {formatDuration(recording.durationSeconds)} · {formatBytes(recording.sizeBytes)} ·{' '}
          {formatDateTime(recording.createdAt)}
        </p>

        <div className="mt-4">
          <AudioPlayer player={player} />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <Field
              label="Título"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            onClick={rename}
            disabled={renaming || !title.trim() || title.trim() === recording.title}
          >
            Salvar
          </Button>
        </div>

        {/* Only for a recording that FINISHED: failed has its own button below,
            and one still in the pipeline has a job on it already. */}
        {recording.status === 'ready' ? (
          <button
            type="button"
            onClick={askToReprocess}
            disabled={retrying}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-ink disabled:opacity-40"
          >
            <RefreshCw size={13} aria-hidden />
            {retrying ? 'Reenviando…' : 'Transcrever e resumir de novo'}
          </button>
        ) : null}
      </section>

      {/* Three states, three different things to say — a spinner for all of them
          would hide the one case where the user has something to do. */}
      {recording.status === 'failed' ? (
        <section className="rounded-2xl border border-bad/40 bg-bad/5 p-5">
          <h3 className="text-sm font-semibold text-bad">Não consegui processar</h3>
          <p className="mt-1 text-sm text-ink2">{recording.failureReason}</p>
          <Button variant="ghost" onClick={retry} disabled={retrying} className="mt-4">
            {retrying ? 'Reenviando…' : 'Tentar de novo'}
          </Button>
        </section>
      ) : null}

      {/* Two different sentences on purpose: the FIRST time there is nothing on
          the page yet, so the wait is the whole content; on a reprocess the
          previous transcript and summary are right below, and the screen has to
          say they are the old ones instead of letting them pass as current. */}
      {recording.status !== 'ready' && recording.status !== 'failed' ? (
        <section className="rounded-2xl border border-line2 bg-panel p-5">
          <Loading compact label={refreshing ? 'ATUALIZANDO' : 'PROCESSANDO'} />
          <p className="text-center text-xs text-muted">
            {refreshing
              ? 'Estou transcrevendo e resumindo de novo. O que está aqui embaixo ainda é o resultado anterior — troco assim que o novo ficar pronto.'
              : 'Estou transcrevendo e resumindo. Pode fechar a página — aviso na sua caixa de entrada quando terminar.'}
          </p>
        </section>
      ) : null}

      {summary ? <SummaryPanel summary={summary} recordingId={recording.id} /> : null}
      {/* Needs a transcript, not a summary: the question is answered from what
          was SAID. */}
      {transcription ? <AskPanel recordingId={recording.id} /> : null}
      {transcription ? (
        <TranscriptPanel
          transcription={transcription}
          player={player}
          defaultOpen={startAtSeconds !== undefined}
        />
      ) : null}

      <ConfirmDialog
        open={confirmingReprocess}
        title="Processar esse áudio de novo?"
        description={
          <>
            A transcrição e o resumo atuais são <strong className="text-ink">substituídos</strong>{' '}
            pelo que sair desta vez, e os dois modelos rodam outra vez. O áudio em si não muda. Serve
            pra uma gravação antiga ganhar o que o pipeline faz hoje — como os trechos com o momento
            em que foram ditos.
          </>
        }
        confirmLabel={retrying ? 'Enviando…' : 'Processar de novo'}
        onConfirm={retry}
        onCancel={cancelReprocess}
      />
    </div>
  )
}
