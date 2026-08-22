import { Injectable } from '@nestjs/common'
import { HashProvider } from '@auth/adapters'
import * as bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

@Injectable()
export class BcryptHashProvider implements HashProvider {
  hash(password: string): string {
    const salt = bcrypt.genSaltSync(12)
    return bcrypt.hashSync(password, salt)
  }

  compare(password: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(password, hashedPassword)
  }

  // bcrypt truncates at 72 bytes; the refresh is a long JWT. Hashing with sha256
  // first ensures the bcrypt input is short AND includes the JWT signature.
  hashToken(token: string): string {
    return bcrypt.hashSync(this.sha256(token), bcrypt.genSaltSync(12))
  }

  compareToken(token: string, hashedToken: string): boolean {
    return bcrypt.compareSync(this.sha256(token), hashedToken)
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
}
