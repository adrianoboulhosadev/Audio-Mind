import { AxiosError } from 'axios'
import { ERROR_MESSAGES, GENERIC_ERROR_MESSAGE } from '@/data/error-messages'

interface DomainErrorBody {
  statusCode: number
  errors: { code: string }[]
}

/** The first domain code the API answered, if it answered in the domain shape. */
export function errorCode(error: unknown): string | null {
  const body = (error as AxiosError<DomainErrorBody>)?.response?.data
  return body?.errors?.[0]?.code ?? null
}

/**
 * The sentence to show the user. Every route in this API answers
 * `{ statusCode, errors: [{ code }] }` (see DomainExceptionFilter), so the code
 * is the only thing worth reading — the copy lives in the front, in Portuguese,
 * next to the rest of the interface.
 */
export function errorMessage(error: unknown): string {
  const code = errorCode(error)
  return (code && ERROR_MESSAGES[code]) || GENERIC_ERROR_MESSAGE
}
