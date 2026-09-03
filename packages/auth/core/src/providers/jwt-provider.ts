export interface JwtTokens {
  accessToken: string
  refreshToken: string
}

/**
 * What a token is FOR.
 *
 * It is a claim and not a convention because every token this app signs uses the
 * SAME secret: without it, "is this signature valid?" and "is this the kind of
 * token this route accepts?" collapse into one question, and any token becomes
 * every token. The audio capability token (issued in the recording app layer)
 * carries its own `purpose` for the same reason.
 */
export type TokenType = 'access' | 'refresh'

/**
 * Token claims. userId/email are the identity. `sessionId` only goes in the
 * REFRESH (it identifies the rotation family) — optional because the access
 * token does not use it.
 *
 * `type` is stamped by the PROVIDER when it issues the pair, never by the caller:
 * a use case that had to remember to set it is a use case that can forget, and
 * forgetting means the 7-day refresh works as a 15-minute access token.
 */
export interface JwtPayload {
  userId: string
  email: string
  sessionId?: string
  type?: TokenType
}

/**
 * JWT issuing/verification port (implemented by jsonwebtoken in the backend).
 * Access (15m) and refresh (7d) are JWTs — `generateTokens` issues the pair, and
 * it is the ONE place that decides which is which: whatever payload it receives,
 * the access token comes back stamped `type: 'access'` and the refresh
 * `type: 'refresh'`. On /refresh, verifying the refresh yields the userId +
 * sessionId used to find the session. JWT is an infra detail, which is why
 * JwtTokens lives here, not in the model.
 */
export interface JwtProvider {
  generateToken(payload: string | object): string
  generateTokens(payload: object): JwtTokens
  verifyToken(token: string, secret: string): string | object
}
