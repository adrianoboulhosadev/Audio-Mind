import { ValidationError, Errors } from 'shared'

/**
 * How long a link stays alive.
 *
 * Validity is MANDATORY — there is no "forever" option. A link that never
 * expires is a copy of the recording loose on the internet that nobody
 * remembers giving away; an expiry means the default outcome of forgetting
 * about a link is that it stops working, instead of that it keeps working.
 *
 * Three windows and not a free number: a date picker on this question invites
 * "31/12/2099", and the three cover what people actually mean — send it now,
 * this week, this month.
 */
export type ShareWindow = '24h' | '7d' | '30d'

export const SHARE_WINDOWS: readonly ShareWindow[] = ['24h', '7d', '30d']

const HOURS: Record<ShareWindow, number> = {
  '24h': 24,
  '7d': 7 * 24,
  '30d': 30 * 24,
}

const MS_PER_HOUR = 60 * 60 * 1000

/** FAIL-CLOSED: an unknown window is the SHORTEST one, never the longest — the
 * safe way to be wrong about how long a secret lives is for it to die early. */
export function toShareWindow(value?: string | null): ShareWindow {
  return SHARE_WINDOWS.includes(value as ShareWindow) ? (value as ShareWindow) : '24h'
}

export function expirationFor(window?: string | null): Date {
  return new Date(Date.now() + HOURS[toShareWindow(window)] * MS_PER_HOUR)
}

/** Guards the stored value: a row (or a request) claiming a far-future date is
 * clamped to the longest window this app ever hands out. */
export function assertWithinLongestWindow(expiresAt: Date): void {
  const ceiling = Date.now() + HOURS['30d'] * MS_PER_HOUR
  // A minute of slack: the ceiling is computed a moment after the expiry was.
  if (expiresAt.getTime() > ceiling + 60_000) {
    ValidationError.throwError(Errors.INVALID_SHARE_EXPIRATION)
  }
}
