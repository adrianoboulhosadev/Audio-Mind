'use client'

import { splitIntoParagraphs, type SummaryDTO } from '@summary/adapters'
import { Button } from '@/components/button'
import { SummaryBullet } from '@/components/summary-bullet'
import { api } from '@/lib/api'

/**
 * The product of the whole pipeline. The PDF is fetched as a blob for the same
 * reason the audio is (an authenticated route, no header on a plain link) and
 * handed to the browser as a download.
 */
export function SummaryPanel({ summary, recordingId }: { summary: SummaryDTO; recordingId: string }) {
  const download = async () => {
    const { data } = await api.get<Blob>(`/summary/recording/${recordingId}/pdf`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${summary.headline}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{summary.headline}</h2>
        {summary.pdfUrl ? <Button onClick={download}>Baixar PDF</Button> : null}
      </div>

      {/* Parágrafo a parágrafo, e não um bloco com `whitespace-pre-line`: o
          modelo nem sempre devolve as quebras, e resumo antigo é sempre um bloco
          só (ver splitIntoParagraphs). */}
      <div className="mt-3 flex flex-col gap-3">
        {splitIntoParagraphs(summary.overview).map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed text-ink2">
            {paragraph}
          </p>
        ))}
      </div>

      {/* An empty section is omitted entirely: a heading over nothing reads like
          the summary failed, and "sem próximos passos" is a real outcome. */}
      {summary.topics.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Pontos principais
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {summary.topics.map((topic) => (
              <SummaryBullet key={topic} text={topic} dotClassName="bg-accent" />
            ))}
          </ul>
        </div>
      ) : null}

      {summary.actionItems.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Próximos passos
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {summary.actionItems.map((item) => (
              <SummaryBullet key={item} text={item} dotClassName="bg-good" />
            ))}
          </ul>
        </div>
      ) : null}

    </section>
  )
}
