/** Presentation-only formatting shared by more than one screen. */

/** 125 -> "2:05", 3725 -> "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * A DTO says `Date`, but over JSON it arrives as a STRING — so every date is
 * re-wrapped before being read. Doing it here once is what keeps a
 * `.toLocaleDateString is not a function` out of the screens.
 */
export function formatDateTime(value: Date | string): string {
  const date = new Date(value)
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** "agora", "há 5 min", "há 3 h", then a plain date. */
export function formatRelative(value: Date | string): string {
  const elapsed = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(elapsed / 60_000)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days} d`

  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
