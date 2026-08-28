import type { UserDTO, UserRole } from '@auth/core'
// USER_ROLES/toUserRole go out as VALUES: the backend maps a role to an upload
// allowance and needs the real list, not a structural type.
import { USER_ROLES, toUserRole } from '@auth/core'

export type { UserDTO, UserRole }
export { USER_ROLES, toUserRole }
