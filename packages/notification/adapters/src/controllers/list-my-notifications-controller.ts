import {
  ListMyNotificationsQuery,
  NotificationQueryRepository,
  NotificationFeedDTO,
} from '@notification/core'

export default class ListMyNotificationsController {
  constructor(private readonly queryRepository: NotificationQueryRepository) {}

  async execute(userId: string, limit?: number): Promise<NotificationFeedDTO> {
    return new ListMyNotificationsQuery(this.queryRepository).execute({ userId, limit })
  }
}
