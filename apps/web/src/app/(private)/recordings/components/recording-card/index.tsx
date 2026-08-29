'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Quote, SquareArrowOutUpRight, Trash2 } from 'lucide-react'
import type { RecordingDTO } from '@recording/adapters'
import { IconButton } from '@/components/icon-button'
import { StatusBadge } from '@/components/status-badge'
import { formatBytes, formatDuration, formatRelative } from '@/lib/format'

interface RecordingCardProps {
  recording: RecordingDTO
  onDelete: (recording: RecordingDTO) => void
  /** Only in a SEARCH: the stretch of speech that matched the term. */
  excerpt?: string | null
  /** The second that stretch was said, when the transcript carries timestamps.
   * With it, the card opens the recording AT that moment. */
  startSeconds?: number | null
}

export function RecordingCard({ recording, onDelete, excerpt, startSeconds }: RecordingCardProps) {
  const router = useRouter()
  // `?t=` is what the detail screen reads to put the player on the moment.
  const href =
    startSeconds != null ? `/recordings/${recording.id}?t=${Math.floor(startSeconds)}` : `/recordings/${recording.id}`

  return (
    <li className="rounded-xl border border-line2 bg-panel p-4 transition hover:border-accent/50">
      <div className="flex items-start justify-between gap-3">
        <Link href={href} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{recording.title}</p>
          <p className="mt-1 text-xs text-muted">
            {formatDuration(recording.durationSeconds)} · {formatBytes(recording.sizeBytes)} ·{' '}
            {formatRelative(recording.createdAt)}
          </p>
        </Link>
        <StatusBadge status={recording.status} />
      </div>

      {/* What the search actually matched, quoted. Finding the audio is half the
          job; the other half is not making someone hunt through an hour of it,
          which is why the timestamp rides along in the link above. */}
      {excerpt ? (
        <Link href={href} className="mt-3 flex gap-2 rounded-lg bg-panel2 px-3 py-2">
          <Quote size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <span className="text-xs leading-relaxed text-ink2">
            {excerpt}
            {startSeconds != null ? (
              <span className="ml-1.5 whitespace-nowrap text-[11px] tabular-nums text-accent">
                {formatDuration(startSeconds)}
              </span>
            ) : null}
          </span>
        </Link>
      ) : null}

      {/* The reason is shown right where the failure is, not hidden behind the
          detail page: it is what tells the user whether retrying is worth it. */}
      {recording.failureReason ? (
        <p className="mt-3 rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-xs text-bad">
          {recording.failureReason}
        </p>
      ) : null}

      {/* The title above is already the link to the recording. These are the same
          two actions as icons, sitting where a row of controls is expected —
          each one keeps its words in a tooltip and in its accessible name. */}
      {/* Negative margins pull the row into the card's own padding: an icon
          button is mostly padding, so laid out normally it leaves a band of
          empty card under the text. */}
      <div className="-mb-1.5 -mr-1.5 mt-0 flex items-center justify-end gap-0.5">
        <IconButton
          label="Abrir"
          tone="accent"
          onClick={() => router.push(href)}
          icon={<SquareArrowOutUpRight size={17} aria-hidden />}
        />
        <IconButton
          label="Excluir"
          tone="danger"
          tipSide="left"
          onClick={() => onDelete(recording)}
          icon={<Trash2 size={17} aria-hidden />}
        />
      </div>
    </li>
  )
}
