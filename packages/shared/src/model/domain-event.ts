/**
 * Base of every DOMAIN EVENT — a plain, past-tense fact ("a recording became
 * ready", "the processing failed"), recorded by an AggregateRoot at the exact
 * moment its state changed. Carries only what the aggregate itself knows;
 * enrichment (the owner's e-mail, the notification copy) stays the job of
 * whoever consumes the event later.
 */
export abstract class DomainEvent {
  readonly occurredAt: Date

  protected constructor() {
    this.occurredAt = new Date()
  }
}
