'use client'

import { useParams } from 'next/navigation'
import { AudioLines, Quote } from 'lucide-react'
import { Loading } from '@/components/loading'
import { RECORDING_KIND_LABELS } from '@/data/recording-kinds'
import { formatDateTime, formatDuration } from '@/lib/format'
import { SHARE_FAILURES, UNKNOWN_SHARE_FAILURE } from './data/share-failures'
import { useSharedDocument } from './hooks/use-shared-document'

/**
 * A summary somebody sent you — the only screen in this app that works without
 * an account.
 *
 * It is a DOCUMENT, not a copy of the app: no navigation, no login prompt in the
 * way, nothing offered that the visitor cannot do. What it does say, in the
 * footer, is when the link stops working — finding that out by it breaking is
 * worse.
 */
export default function SharedSummaryPage() {
  const { token } = useParams<{ token: string }>()
  const { document, isLoading, failure, apiBaseUrl } = useSharedDocument(token)

  if (isLoading) return <Loading fullScreen />

  if (!document) {
    const { title, body } = (failure && SHARE_FAILURES[failure]) || UNKNOWN_SHARE_FAILURE
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line2 bg-panel p-6 text-center">
        <h1 className="text-base font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    )
  }

  const { recording, summary, transcript, audioUrl, expiresAt } = document

  return (
    <article className="flex flex-col gap-6">
      <header>
        <div className="flex items-center gap-2 text-accent">
          <AudioLines size={18} aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-widest">Audio Mind</span>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-ink sm:text-2xl">{summary.headline}</h1>
        <p className="mt-2 text-xs text-muted">
          {recording.title} · {RECORDING_KIND_LABELS[recording.kind as 'other'] ?? 'Áudio'} ·{' '}
          {formatDuration(recording.durationSeconds)} · {formatDateTime(recording.createdAt)}
        </p>
      </header>

      {/* Só aparece se o dono marcou explicitamente que o áudio vai junto — o
          padrão é resumo e nada mais. */}
      {audioUrl ? (
        <audio
          controls
          preload="metadata"
          src={`${apiBaseUrl}${audioUrl}`}
          className="w-full"
        />
      ) : null}

      <section className="rounded-2xl border border-line2 bg-panel p-5">
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink2">{summary.overview}</p>

        {summary.topics.length > 0 ? (
          <div className="mt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Pontos principais
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {summary.topics.map((topic) => (
                <li key={topic} className="flex gap-2 text-sm text-ink2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {summary.actionItems.length > 0 ? (
          <div className="mt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Próximos passos
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {summary.actionItems.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-ink2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-good" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {transcript ? (
        <section className="rounded-2xl border border-line2 bg-panel p-5">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Quote size={13} aria-hidden />O que foi dito
          </h2>
          {/* Com os trechos, cada linha vem com o minuto em que foi falada; sem
              eles (transcrição antiga), o texto corrido é o que existe. */}
          {transcript.segments.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {transcript.segments.map((segment, index) => (
                <li key={`${segment.startSeconds}-${index}`} className="flex gap-3">
                  <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-accent">
                    {formatDuration(segment.startSeconds)}
                  </span>
                  <span className="text-sm leading-relaxed text-ink2">{segment.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink2">
              {transcript.text}
            </p>
          )}
        </section>
      ) : null}

      <footer className="pb-6 text-center text-xs text-muted">
        Esse link expira em {formatDateTime(expiresAt)}. Quem compartilhou pode desativá-lo antes
        disso.
      </footer>
    </article>
  )
}
