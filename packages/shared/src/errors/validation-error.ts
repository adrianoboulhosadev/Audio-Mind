import { DomainError } from './domain-error'

/**
 * Invalid input / format rule (becomes 400 in the backend).
 * It is the ONLY error accumulable via `Validator.combineErrors`.
 */
export class ValidationError extends DomainError {}
