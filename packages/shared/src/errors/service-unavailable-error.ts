import { DomainError } from './domain-error'

/**
 * A dependency this request needed is not answering right now (becomes 503 in
 * the backend). It is the ONE error here that is not about the caller: nothing
 * they typed is wrong, and the same request is likely to work later.
 *
 * It exists so that "the model is down / not configured" reaches the screen as
 * a sentence the user can act on, instead of falling into the filter's
 * UNKNOWN_ERROR branch, which is deliberately vague and would tell them only
 * that something broke.
 */
export class ServiceUnavailableError extends DomainError {}
