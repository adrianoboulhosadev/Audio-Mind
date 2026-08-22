import type { RecordingStatus } from '@recording/adapters'
import { STATUS_INFO } from './data/status-styles'

export function StatusBadge({ status }: { status: RecordingStatus }) {
  const { label, className } = STATUS_INFO[status]
  const processing = status === 'transcribing' || status === 'summarizing'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {processing ? <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce1" /> : null}
      {label}
    </span>
  )
}
