import { UserDTO } from '@auth/adapters'
import { AudioAllowance } from '@recording/adapters'

/**
 * Maps an identity to how much audio it may hand over.
 *
 * This mapping lives in the APP, not in either context: `auth` knows what a role
 * is and nothing about audio; `recording` knows what an allowance is and nothing
 * about roles. Bridging them is exactly the app layer's job, and it is one line
 * so there is a single place to read when someone asks "who can upload a 1 GB
 * file?".
 *
 * Fail-closed by construction: anything that is not an admin — including a
 * missing user — gets the standard allowance.
 */
export function allowanceFor(user?: Pick<UserDTO, 'role'> | null): AudioAllowance {
  return user?.role === 'admin' ? 'extended' : 'standard'
}
