import { Injectable, Logger } from '@nestjs/common'
import { DomainEvent, EventPublisher } from 'shared'
import { NotificationFacade, NotificationInput } from '@notification/adapters'
import { UserRegistered } from '@auth/adapters'
import { RecordingFailed, RecordingReady } from '@recording/adapters'
import { PrismaNotificationRepository } from './prisma-notification-repository'
import { LiveUpdates } from './live-updates'

/**
 * The single place that turns a DOMAIN EVENT into the notification(s) it
 * deserves. Controllers just call their facade; every "what do we tell whom"
 * decision lives here.
 *
 * Implements the `EventPublisher` port from `shared`, so the use cases depend on
 * an interface, never on this class.
 *
 * Two deliberate choices about WHEN and HOW it runs:
 *
 * 1. It runs AFTER the business operation committed, never inside its
 *    transaction — an upload that worked must not be rolled back because an
 *    inbox line failed to write.
 * 2. It swallows its own failures (logging them): the caller's HTTP response
 *    describes the upload, and a notification that never arrived is not a
 *    reason to tell the user their audio failed.
 *
 * Unknown events are ignored on purpose: a context is free to raise an event
 * nobody notifies about yet (that is the point of events being facts, not
 * commands), and adding one must never break an existing flow.
 */
@Injectable()
export class DomainEventListener implements EventPublisher {
  private readonly logger = new Logger(DomainEventListener.name)

  constructor(
    private readonly notificationRepository: PrismaNotificationRepository,
    private readonly liveUpdates: LiveUpdates,
  ) {}

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.deliver(this.translate(event))
      } catch (error) {
        this.logger.error(`failed to handle ${event.constructor.name}`, error as Error)
      }
    }
  }

  private async deliver(items: NotificationInput[]): Promise<void> {
    if (items.length === 0) return

    await new NotificationFacade(this.notificationRepository).send(items)
    // Only after the write succeeded: a ping for a notification that failed to
    // save would make the client re-read and find nothing.
    await this.liveUpdates.notifyUsers(items.map((item) => item.userId))
  }

  private translate(event: DomainEvent): NotificationInput[] {
    if (event instanceof UserRegistered) {
      // No referenceId: this is a one-off greeting, not a fact about a thing.
      return [{ userId: event.userId, type: 'welcome' }]
    }

    // The pipeline normally ends inside the WORKER, which writes its own
    // notifications — these two branches exist because the same events also
    // travel through the backend whenever it drives a transition itself, and a
    // listener that knew only half its context's events would be a trap.
    if (event instanceof RecordingReady) {
      return [
        {
          userId: event.ownerId,
          type: 'recording_ready',
          referenceId: event.recordingId,
          recordingId: event.recordingId,
          title: event.title,
        },
      ]
    }

    if (event instanceof RecordingFailed) {
      return [
        {
          userId: event.ownerId,
          type: 'recording_failed',
          referenceId: event.recordingId,
          recordingId: event.recordingId,
          title: event.title,
          reason: event.reason,
        },
      ]
    }

    return []
  }
}
