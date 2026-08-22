import type { CookieOptions } from 'express'

// Options for the refresh token's httpOnly cookie (static data). The refresh
// goes in the cookie (XSS-safe), never in the response body. `secure` only in
// production — the browser does not store a `secure` cookie over http://localhost.
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, same as the session validity
}
