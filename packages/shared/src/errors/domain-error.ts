import { Errors } from '../constants/errors'

export interface DomainErrorProps {
  code?: string
  value?: unknown
  extras?: object
}

/**
 * Base of every DOMAIN error. Carries a stable code (+ value/extras).
 * It does NOT know about HTTP — the type/code -> status translation happens
 * in the backend (filter). The children (ValidationError, NotFoundError, ...)
 * inherit `create`/`throwError`, which already build the correct subclass.
 */
export class DomainError extends Error {
  readonly code: string
  readonly value: unknown
  readonly extras: object

  constructor(props?: DomainErrorProps) {
    super(props?.code ?? Errors.UNKNOWN_ERROR)
    this.code = props?.code ?? Errors.UNKNOWN_ERROR
    this.value = props?.value
    this.extras = props?.extras ?? {}
  }

  static create<T extends DomainError>(
    this: new (props?: DomainErrorProps) => T,
    code?: string,
    value?: unknown,
    extras?: object,
  ): T {
    return new this({ code, value, extras })
  }

  static throwError<T extends DomainError>(
    this: new (props?: DomainErrorProps) => T,
    code: string,
    value?: unknown,
    extras?: object,
  ): never {
    throw new this({ code, value, extras })
  }
}
