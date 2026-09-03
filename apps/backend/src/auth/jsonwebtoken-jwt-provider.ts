import { Injectable } from '@nestjs/common'
import { JwtProvider, JwtTokens } from '@auth/adapters'
import * as jwt from 'jsonwebtoken'

// Access (15m) and refresh (7d) are JWTs. The refresh carries {userId, email,
// sessionId} so that /refresh can verify it and discover whose session it is.
//
// Both are signed with the SAME secret, so each is stamped with its `type` HERE,
// at the single point that issues them. Without the stamp the two are
// byte-for-byte the same shape and only the expiry differs — which means the
// refresh cookie, good for 7 days, would be accepted anywhere the 15-minute
// access token is, and logging out (which only invalidates the refresh AT
// /auth/refresh) would leave that token opening the account for a week.
@Injectable()
export class JsonWebTokenProvider implements JwtProvider {
  generateToken(payload: string | object): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' })
  }

  generateTokens(payload: object): JwtTokens {
    const secret = process.env.JWT_SECRET!
    return {
      accessToken: jwt.sign({ ...payload, type: 'access' }, secret, { expiresIn: '15m' }),
      refreshToken: jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: '7d' }),
    }
  }

  verifyToken(token: string, secret: string): string | object {
    return jwt.verify(token, secret)
  }
}
