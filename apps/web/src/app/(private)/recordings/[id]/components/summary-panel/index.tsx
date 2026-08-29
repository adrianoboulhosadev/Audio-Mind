'use client'

import type { SummaryDTO } from '@summary/adapters'
import { Button } from '@/components/button'
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

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink2">{summary.overview}</p>

      {/* An empty section is omitted entirely: a heading over nothing reads like
          the summary failed, and "sem próximos passos" is a real outcome. */}
      {summary.topics.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Pontos principais
          </h3>
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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Próximos passos
          </h3>
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
  )
}
