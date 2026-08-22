import { AuthSession } from '../model'

/**
 * Refresh sessions port (stateful auth, multi-device). One row per rotation
 * family (= one login/device); the row id travels as the `sessionId` claim in
 * the refresh JWT, so the lookup is direct by id. Rotation UPDATES the row hash;
 * deleting the row = revoking the family.
 */
export interface AuthSessionRepository {
  save(session: AuthSession): Promise<void>
  findById(id: string): Promise<AuthSession | null>
  findActiveByUser(userId: string): Promise<AuthSession[]>
  update(session: AuthSession): Promise<void>
  delete(id: string): Promise<void>
  // Revokes all of the user's sessions (logout-all / deactivation).
  deleteAllByUser(userId: string): Promise<void>
}
