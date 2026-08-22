import { ConflictError, DomainError, Errors, NotFoundError } from '../../src'

describe('DomainError', () => {
  it('falls back to the generic code when none is given', () => {
    expect(new DomainError().code).toBe(Errors.UNKNOWN_ERROR)
  })

  it('create builds the SUBCLASS, not the base', () => {
    const error = NotFoundError.create(Errors.RECORDING_NOT_FOUND, 'abc')
    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.code).toBe(Errors.RECORDING_NOT_FOUND)
    expect(error.value).toBe('abc')
  })

  it('throwError throws the right subclass (that is what the filter maps to a status)', () => {
    expect(() => ConflictError.throwError(Errors.USER_ALREADY_EXISTS)).toThrow(ConflictError)
  })
})
