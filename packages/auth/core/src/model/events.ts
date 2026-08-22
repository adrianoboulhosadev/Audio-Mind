import { DomainEvent } from 'shared'

/**
 * Raised directly by `RegisterUser` (not via `AggregateRoot.record`): creating
 * the identity IS the fact, and `User`'s constructor is also what reconstitutes
 * an existing row, so it can never record anything itself.
 */
export class UserRegistered extends DomainEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    super()
  }
}
