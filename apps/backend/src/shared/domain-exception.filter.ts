import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import {
  DomainError,
  ValidationError,
  UnauthorizedError,
  AccessDeniedError,
  NotFoundError,
  ConflictError,
  Errors,
} from 'shared'

/**
 * Translates DOMAIN errors into HTTP responses. The core/use-cases/entities are
 * agnostic of HTTP — they throw a typed error; it is HERE that the TYPE becomes
 * a status. Covers both a single error and the list that
 * `Validator.combineErrors` throws (always ValidationError).
 */
function statusOf(error: DomainError): number {
  if (error instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED // 401
  if (error instanceof AccessDeniedError) return HttpStatus.FORBIDDEN // 403
  if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND // 404
  if (error instanceof ConflictError) return HttpStatus.CONFLICT // 409
  if (error instanceof ValidationError) return HttpStatus.BAD_REQUEST // 400
  return HttpStatus.BAD_REQUEST // generic DomainError
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()

    // Nest's native HttpException: respect its status/body.
    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json(exception.getResponse())
    }

    // Domain error(s) (single, or the list from combineErrors).
    const candidates = Array.isArray(exception) ? exception : [exception]
    const errors = candidates.filter((error): error is DomainError => error instanceof DomainError)

    if (errors.length > 0) {
      const status = statusOf(errors[0])
      return response.status(status).json({
        statusCode: status,
        errors: errors.map((error) => ({ code: error.code })),
      })
    }

    // Unknown: 500 without leaking internal details.
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errors: [{ code: Errors.UNKNOWN_ERROR }],
    })
  }
}
