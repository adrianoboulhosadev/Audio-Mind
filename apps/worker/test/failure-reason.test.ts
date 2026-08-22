import { Errors, NotFoundError, ValidationError } from 'shared'
import { FALLBACK_REASON, failureReasonFor } from '../src/pipeline/failure-reason'

test('turns a domain code into a sentence the OWNER can act on', () => {
  const reason = failureReasonFor(ValidationError.create(Errors.EMPTY_TRANSCRIPT))
  expect(reason).toContain('nenhuma fala')
})

test('a missing file gets its own sentence — retrying would never fix it', () => {
  expect(failureReasonFor({ code: 'ENOENT' })).toContain('não está mais disponível')
})

test('an unknown failure is vague about the cause and precise about the next step', () => {
  expect(failureReasonFor(new Error('socket hang up'))).toBe(FALLBACK_REASON)
})

test('a domain error with no copy of its own still falls back instead of leaking the code', () => {
  const reason = failureReasonFor(NotFoundError.create(Errors.NOTIFICATION_NOT_FOUND))
  expect(reason).toBe(FALLBACK_REASON)
  expect(reason).not.toContain('NOTIFICATION')
})
