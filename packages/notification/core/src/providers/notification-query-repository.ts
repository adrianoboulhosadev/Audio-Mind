import { NotificationDTO } from '../model'

/** Notification READ port (query side of CQRS). */
export interface NotificationQueryRepository {
  /** Newest first, capped at `limit`. */
  listByUserQuery(userId: string, limit: number): Promise<NotificationDTO[]>
  /** The badge: counts the WHOLE inbox, independent of the listed slice. */
  countUnreadQuery(userId: string): Promise<number>
}
