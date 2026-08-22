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
  createdAt: Date
  lastLoginAt: Date | null
}
