import { JwtProvider, JwtTokens } from '../../src'

/**
 * JWT fake for testing the core. Encodes the payload in the token (base64) so
 * verifyToken can return it — necessary because the refresh carries the userId
 * and the sessionId. A counter guarantees distinct tokens per call
 * (multi-device / rotation).
 *
 * It STAMPS the `type` claim exactly like the real provider does. A fake that
 * skipped it would let a test pass that production refuses — the same reason the
 * notification fake replicates its unique index.
 */
export default class JwtProviderInMemory implements JwtProvider {
  private counter = 0

  constructor(private secret: string) {}

  generateToken(payload: string | object): string {
    return `token.${++this.counter}.${Buffer.from(JSON.stringify(payload)).toString('base64')}`
  }

  generateTokens(payload: object): JwtTokens {
    return {
      accessToken: this.generateToken({ ...payload, type: 'access' }),
      refreshToken: this.generateToken({ ...payload, type: 'refresh' }),
    }
  }

  verifyToken(token: string, secret: string): string | object {
    if (secret !== this.secret) throw new Error('invalid signature')
    const body = token.split('.')[2]
    if (!body) throw new Error('malformed token')
    return JSON.parse(Buffer.from(body, 'base64').toString())
  }
}
