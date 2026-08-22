import { DomainEvent } from '../model/domain-event'

/**
 * Outbound port for domain events, same shape as any other optional port a use
 * case takes (e.g. recording/core's RecordingProcessingQueue) — the use case
 * calls it right after persisting; what happens with the events (turning them
 * into a notification, pushing a live update) is entirely the app layer's job.
 */
export interface EventPublisher {
  publish(events: DomainEvent[]): Promise<void>
}
