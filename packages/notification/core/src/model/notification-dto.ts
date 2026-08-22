import { NotificationType } from './notification-input'

/** READ projection (CQRS) of one inbox line. */
export interface NotificationDTO {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: Date
}

/**
 * What a single endpoint gives the front. The bell (a short slice) and the inbox
 * page (a long one) read the SAME shape: `unreadCount` is the badge and always
 * counts the whole inbox, never just the slice that came back.
 */
export interface NotificationFeedDTO {
  unreadCount: number
  items: NotificationDTO[]
}
