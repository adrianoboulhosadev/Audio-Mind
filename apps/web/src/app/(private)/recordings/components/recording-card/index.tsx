'use client'

import Link from 'next/link'
import type { RecordingDTO } from '@recording/adapters'
import { StatusBadge } from '@/components/status-badge'
import { formatBytes, formatDuration, formatRelative } from '@/lib/format'

interface RecordingCardProps {
  recording: RecordingDTO
  onDelete: (recording: RecordingDTO) => void
}

export function RecordingCard({ recording, onDelete }: RecordingCardProps) {
  return (
    <li className="rounded-xl border border-line2 bg-panel p-4 transition hover:border-accent/50">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/recordings/${recording.id}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{recording.title}</p>
          <p className="mt-1 text-xs text-muted">
            {formatDuration(recording.durationSeconds)} · {formatBytes(recording.sizeBytes)} ·{' '}
            {formatRelative(recording.createdAt)}
          </p>
        </Link>
        <StatusBadge status={recording.status} />
      </div>

      {/* The reason is shown right where the failure is, not hidden behind the
          detail page: it is what tells the user whether retrying is worth it. */}
      {recording.failureReason ? (
        <p className="mt-3 rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-xs text-bad">
          {recording.failureReason}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <Link href={`/recordings/${recording.id}`} className="text-xs text-accent hover:underline">
          abrir
        </Link>
        <button
          type="button"
          onClick={() => onDelete(recording)}
          className="text-xs text-muted transition hover:text-bad"
        >
          excluir
        </button>
      </div>
    </li>
  )
}
