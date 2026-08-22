import { DomainError } from './domain-error'

/** Invalid credential or unauthenticated request (becomes 401 in the backend). */
export class UnauthorizedError extends DomainError {}
