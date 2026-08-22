import { DomainError } from './domain-error'

/** Authenticated, but without permission for the action/resource (becomes 403 in the backend). */
export class AccessDeniedError extends DomainError {}
