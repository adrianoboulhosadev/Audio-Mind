import { Injectable } from '@nestjs/common'
import { JwtProvider, JwtTokens } from '@auth/adapters'
import * as jwt from 'jsonwebtoken'

// Access (15m) and refresh (7d) are JWTs. The refresh carries {userId, email,
// sessionId} so that /refresh can verify it and discover whose session it is.
@Injectable()
export class JsonWebTokenProvider implements JwtProvider {
  generateToken(payload: string | object): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' })
  }

  generateTokens(payload: object): JwtTokens {
    const secret = process.env.JWT_SECRET!
    return {
      accessToken: jwt.sign(payload, secret, { expiresIn: '15m' }),
      refreshToken: jwt.sign(payload, secret, { expiresIn: '7d' }),
    }
  }

  verifyToken(token: string, secret: string): string | object {
    return jwt.verify(token, secret)
  }
}
