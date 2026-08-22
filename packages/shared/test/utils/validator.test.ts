import { Errors, ValidationError, Validator } from '../../src'

describe('Validator', () => {
  it('notEmpty rejects an empty or whitespace-only string', () => {
    expect(Validator.notEmpty('ok', Errors.REQUIRED_FIELD)).toBeNull()
    expect(Validator.notEmpty('   ', Errors.REQUIRED_FIELD)).toBeInstanceOf(ValidationError)
    expect(Validator.notEmpty(undefined, Errors.REQUIRED_FIELD)).toBeInstanceOf(ValidationError)
  })

  it('maxLength does NOT echo the rejected value — only the sizes', () => {
    const error = Validator.maxLength('a'.repeat(11), 10, Errors.RECORDING_TITLE_TOO_LONG)!
    expect(error.value).toBeUndefined()
    expect(error.extras).toEqual({ max: 10, length: 11 })
  })

  it('combineErrors returns null when there is no error and the list when there is', () => {
    expect(Validator.combineErrors(null, null)).toBeNull()
    expect(Validator.combineErrors(null, ValidationError.create(Errors.REQUIRED_FIELD))).toHaveLength(1)
  })
})
