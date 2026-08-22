import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { PrismaNotificationRepository } from './prisma-notification-repository'
import { DomainEventListener } from './domain-event-listener'
import { LiveUpdates } from './live-updates'

/**
 * The notification WRITE side, on its own so any module can raise a
 * notification without importing the module that owns the inbox ROUTES — that
 * one imports auth (for the middleware), and auth raising a notification would
 * close the circle into a module cycle.
 */
@Module({
  imports: [DbModule],
  providers: [PrismaNotificationRepository, DomainEventListener, LiveUpdates],
  exports: [PrismaNotificationRepository, DomainEventListener, LiveUpdates],
})
export class NotificationStoreModule {}
