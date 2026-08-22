import { Id } from '../../src'

describe('Id', () => {
  it('generates a valid uuid when no value is given', () => {
    const id = new Id()
    expect(Id.isValid(id.value)).toBe(true)
  })

  it('keeps an existing uuid (reconstitution from a database row)', () => {
    const value = Id.create()
    expect(new Id(value).value).toBe(value)
  })

  it('rejects an id that is not a uuid', () => {
    expect(() => new Id('nope')).toThrow(/Invalid id/)
  })

  it('compares by value', () => {
    const value = Id.create()
    expect(new Id(value).equals(new Id(value))).toBe(true)
    expect(new Id(value).notEquals(new Id())).toBe(true)
  })
})
