const REFRESH_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Validity of the refresh token (session): 7 days from now. */
export function calculateRefreshExpiration(): Date {
  return new Date(Date.now() + REFRESH_DAYS * MS_PER_DAY)
}
