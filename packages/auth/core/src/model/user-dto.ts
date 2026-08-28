import type { UserRole } from './user-role'

/**
 * READ projection (CQRS) of the user — what the database query brings, minus the
 * secret. NEVER includes `password`. Carries the infra/audit fields (createdAt,
 * lastLoginAt) that live only on the read side. Plain interface — no entity, no
 * value objects.
 */
export interface UserDTO {
  id: string
  email: string
  name: string | null
  active: boolean
  /** Decides how big an audio this identity may upload. Flipped by hand in the
   * database — the app has no way to promote anyone. */
  role: UserRole
  createdAt: Date
  lastLoginAt: Date | null
}
