export interface JwtTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Token claims. userId/email are the identity. `sessionId` only goes in the
 * REFRESH (it identifies the rotation family) — optional because the access
 * token does not use it.
 */
export interface JwtPayload {
  userId: string
  email: string
  sessionId?: string
}

/**
 * JWT issuing/verification port (implemented by jsonwebtoken in the backend).
 * Access (15m) and refresh (7d) are JWTs — `generateTokens` issues the pair. On
 * /refresh, verifying the refresh yields the userId + sessionId used to find the
 * session. JWT is an infra detail, which is why JwtTokens lives here, not in the
 * model.
 */
export interface JwtProvider {
  generateToken(payload: string | object): string
  generateTokens(payload: object): JwtTokens
  verifyToken(token: string, secret: string): string | object
}
