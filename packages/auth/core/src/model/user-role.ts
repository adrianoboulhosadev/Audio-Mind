/**
 * What the identity is allowed to do. Deliberately just two values: no
 * permission matrix and no invitation flow. A role decides two things — how big
 * an audio its owner may upload, and whether they can open the admin screen.
 *
 * Promotion IS reachable from the app now (an admin promotes somebody on
 * /admin), which it deliberately was not before: it used to be a hand-run UPDATE
 * precisely because there was nowhere to see who already had it. What has not
 * changed is that the FIRST admin is still made by hand — there is no bootstrap
 * flow, and an app that can create its own first administrator is an app anyone
 * can become administrator of.
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
