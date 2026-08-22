import { DomainError } from './domain-error'

/** Nonexistent resource (becomes 404 in the backend). */
export class NotFoundError extends DomainError {}
