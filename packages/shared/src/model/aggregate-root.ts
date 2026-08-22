import { Entity, EntityProps } from './entity'
import { DomainEvent } from './domain-event'

/**
 * An Entity that also records DOMAIN EVENTS as its own mutator methods change
 * its state — the event is raised right where the transition happens (e.g.
 * `Recording.markAsReady()` records `RecordingReady`), not re-derived later by
 * diffing before/after state.
 *
 * `pullDomainEvents` drains AND clears the list — a use case calls it exactly
 * once per execution, right after persisting, so nothing is ever published
 * twice. The list is never part of `props`, so `clone`/reconstitution from a
 * database row always starts empty: only a transition that happens DURING the
 * current execution ever produces an event, never the act of reading a row.
 */
export abstract class AggregateRoot<T, Props extends EntityProps> extends Entity<T, Props> {
  private domainEvents: DomainEvent[] = []

  protected record(event: DomainEvent): void {
    this.domainEvents.push(event)
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents
    this.domainEvents = []
    return events
  }
}
