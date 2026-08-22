import { Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common'
import { NotificationFacade, NotificationFeedDTO } from '@notification/adapters'
import { UserDTO } from '@auth/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { PrismaNotificationRepository } from './prisma-notification-repository'

/**
 * The inbox. Every route reads the caller's id from `@authenticatedUser`, and
 * ownership is enforced inside the use cases (a foreign notification answers
 * NOTIFICATION_NOT_FOUND — an inbox is private).
 *
 * There is no route to CREATE one: a notification is always a consequence of
 * something else that happened (see NotificationFacade.send).
 */
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationRepository: PrismaNotificationRepository) {}

  private facade(): NotificationFacade {
    return new NotificationFacade(this.notificationRepository, this.notificationRepository)
  }

  @Get()
  async list(
    @authenticatedUser() user: UserDTO,
    @Query('limit') limit?: string,
  ): Promise<NotificationFeedDTO> {
    return this.facade().listMyNotifications(user.id, limit ? Number(limit) : undefined)
  }

  @Post('read-all')
  @HttpCode(200)
  async markAllAsRead(@authenticatedUser() user: UserDTO) {
    await this.facade().markAllAsRead(user.id)
  }

  @Post(':id/read')
  @HttpCode(200)
  async markAsRead(@authenticatedUser() user: UserDTO, @Param('id') id: string) {
    await this.facade().markAsRead(id, user.id)
  }

  @Delete(':id')
  async remove(@authenticatedUser() user: UserDTO, @Param('id') id: string) {
    await this.facade().deleteNotification(id, user.id)
  }

  @Delete()
  async clear(@authenticatedUser() user: UserDTO) {
    await this.facade().deleteAllNotifications(user.id)
  }
}
