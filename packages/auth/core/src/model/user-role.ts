/**
 * What the identity is allowed to do. Deliberately just two values: this app has
 * no admin area, no permission matrix and no invitation flow — the only thing a
 * role decides today is HOW BIG an audio its owner may upload.
 *
 * There is no way to become an admin through the app, and that is the design:
 * promotion is an UPDATE on the column, done by hand by whoever owns the
 * database. A rare, deliberate act has no business being a button.
 */
export type UserRole = 'user' | 'admin'

export const USER_ROLES: readonly UserRole[] = ['user', 'admin']

/**
 * Fail-closed: anything the column holds that is not a known role reads as the
 * ordinary user. A typo in a manual UPDATE must never hand out admin.
 */
export function toUserRole(value?: string | null): UserRole {
  return value === 'admin' ? 'admin' : 'user'
}
