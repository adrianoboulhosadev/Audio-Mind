import * as jwt from 'jsonwebtoken'
import { JwtPayload } from '@auth/adapters'

/**
 * Reads an ACCESS token, or answers null.
 *
 * Every token this app signs — access, refresh, and the audio capability token —
 * uses the same JWT_SECRET, so a valid signature says only "we issued this", not
 * "this is the credential for this route". Checking the `type` claim is what
 * separates the two questions, and it lives HERE, in one function, because it
 * has to hold at both doors that let a caller in: the AuthMiddleware (header)
 * and the StreamAuthGuard (query string). Two copies of the same check is how
 * one of them ends up missing it.
 *
 * Refusing what is NOT an access token is the point:
 * - the refresh token lives 7 days and is only revoked at /auth/refresh, so as a
 *   bearer it would outlive both logout and the reuse detection;
 * - the audio capability token travels in a query string — browser history,
 *   server logs — and is deliberately scoped to one recording.
 *
 * Fail-closed: a token with no `type` at all is refused too. Tokens issued
 * before the claim existed are indistinguishable from one another, which is the
 * very thing being fixed, so they stop being accepted — sessions from before the
 * deploy log in again.
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    return payload?.type === 'access' && payload.userId ? payload : null
  } catch {
    return null
  }
}
