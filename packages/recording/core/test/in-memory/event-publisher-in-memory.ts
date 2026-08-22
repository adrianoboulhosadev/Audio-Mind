import { DomainEvent, EventPublisher } from 'shared'

/** Collects what a use case published, so a test can assert the FACT was raised
 * (and, just as important, that a path which must stay silent raised nothing). */
export default class EventPublisherInMemory implements EventPublisher {
  readonly published: DomainEvent[] = []

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events)
  }
}
