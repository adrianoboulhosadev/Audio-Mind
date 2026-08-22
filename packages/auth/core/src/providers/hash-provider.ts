/**
 * Hashing port (implemented by bcrypt in apps/backend).
 * - hash/compare: passwords (bcrypt directly).
 * - hashToken/compareToken: refresh tokens. Since the refresh is a (long) JWT and
 *   bcrypt truncates at 72 bytes, the adapter applies sha256 BEFORE bcrypt
 *   (bcrypt(sha256(token))) — so the JWT signature also enters the hash.
 */
export interface HashProvider {
  hash(password: string): string
  compare(password: string, hashedPassword: string): boolean
  hashToken(token: string): string
  compareToken(token: string, hashedToken: string): boolean
}
