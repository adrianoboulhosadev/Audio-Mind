import { DomainEvent, EventPublisher } from 'shared'
import { NotificationFacade, NotificationInput } from '@notification/adapters'
import { RecordingFailed, RecordingReady } from '@recording/adapters'
import { PrismaNotificationRepository } from '../persistence/prisma-notification-repository'
import { LiveUpdates } from './live-updates'

/**
 * Turns the pipeline's domain events into inbox lines — the worker's half of
 * what the backend's DomainEventListener does. Implements `EventPublisher`, so
 * the use cases depend on the interface and never on this class.
 *
 * The two apps translate their own events rather than sharing a translator: a
 * shared one would have to live in a package that both import, and "what we tell
 * the user when a pipeline ends" is not a domain rule — it is this app's copy,
 * next to the app that ends the pipeline.
 *
 * Failures are swallowed (and logged): the recording is already marked ready in
 * the database, and telling BullMQ the job failed over a missing inbox line
 * would re-run the whole transcription.
 */
export class PipelineEventPublisher implements EventPublisher {
  constructor(
    private readonly notificationRepository: PrismaNotificationRepository,
    private readonly liveUpdates: LiveUpdates,
  ) {}

  async publish(events: DomainEvent[]): Promise<void> {
    const items = events.flatMap((event) => this.translate(event))
    if (!items.length) return

    try {
      await new NotificationFacade(this.notificationRepository).send(items)
      // Only after the write succeeded: a ping for a notification that failed to
      // save would make the client re-read and find nothing.
      await this.liveUpdates.notifyUsers(items.map((item) => item.userId))
    } catch (error) {
      console.error('[worker] failed to deliver pipeline notifications:', error)
    }
  }

  private translate(event: DomainEvent): NotificationInput[] {
    if (event instanceof RecordingReady) {
      return [
        {
          userId: event.ownerId,
          type: 'recording_ready',
          // The recording id is the reference that makes re-delivery idempotent.
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
