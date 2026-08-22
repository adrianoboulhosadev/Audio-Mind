import { DomainError } from './domain-error'

/** Conflicting state / duplicated resource (becomes 409 in the backend). */
export class ConflictError extends DomainError {}
