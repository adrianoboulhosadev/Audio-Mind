import { Errors } from 'shared'
import { DisplayName, Email, StrongPassword, User } from '../src'

const HASH = '$2a$12$' + 'a'.repeat(53)

describe('Email', () => {
  it('normalizes trim + lowercase', () => {
    expect(new Email('  Fulano@Email.COM ').value).toBe('fulano@email.com')
  })

  it('rejects a malformed address', () => {
    expect(() => new Email('fulano@')).toThrow(expect.objectContaining({ code: Errors.INVALID_EMAIL }))
  })

  it('rejects an address past the length ceiling', () => {
    const huge = `${'a'.repeat(250)}@b.com`
    expect(() => new Email(huge)).toThrow(expect.objectContaining({ code: Errors.INVALID_EMAIL }))
  })
})

describe('StrongPassword', () => {
  it('demands upper case, digit, special char and 8+ chars', () => {
    expect(new StrongPassword('Senha@123').value).toBe('Senha@123')
    expect(() => new StrongPassword('senha123')).toThrow(
      expect.objectContaining({ code: Errors.WEAK_PASSWORD }),
    )
  })

  it('never carries the rejected secret in the error', () => {
    try {
      new StrongPassword('curta')
    } catch (error) {
      expect((error as { value?: unknown }).value).toBeUndefined()
    }
  })
})

describe('DisplayName', () => {
  it('caps the length', () => {
    expect(() => new DisplayName('a'.repeat(81))).toThrow(
      expect.objectContaining({ code: Errors.NAME_TOO_LONG }),
    )
  })
})

describe('User', () => {
  it('builds the value objects and defaults to active', () => {
    const user = new User({ email: 'a@b.com', password: HASH })
    expect(user.email.value).toBe('a@b.com')
    expect(user.active).toBe(true)
    expect(user.name).toBeNull()
  })

  it('withoutPassword drops the secret but keeps the identity', () => {
    const user = new User({ email: 'a@b.com', password: HASH })
    const projection = user.withoutPassword()
    expect(projection.password).toBeUndefined()
    expect(projection.id.value).toBe(user.id.value)
  })

  it('editProfile only touches the display name', () => {
    const user = new User({ email: 'a@b.com', password: HASH, name: 'Antes' })
    user.editProfile({ name: '  Depois  ' })
    expect(user.name).toBe('Depois')
    expect(user.email.value).toBe('a@b.com')
  })

  it('deactivate flips the flag (soft delete)', () => {
    const user = new User({ email: 'a@b.com', password: HASH })
    user.deactivate()
    expect(user.active).toBe(false)
  })
})

// --- role ----------------------------------------------------------------------

test('a user is ordinary unless the column says exactly "admin"', () => {
  expect(new User({ email: 'a@b.com', role: 'admin' }).isAdmin).toBe(true)

  // Everything else — a typo in a hand-run UPDATE, an old value, nothing at all —
  // must read as an ordinary user. A role is only ever granted on purpose.
  for (const role of [undefined, null, '', 'user', 'Admin', 'ADMIN', 'administrator', 'root']) {
    expect(new User({ email: 'a@b.com', role }).isAdmin).toBe(false)
  }
})

test('an unknown role does not fail the reconstitution', () => {
  const user = new User({ email: 'a@b.com', role: 'sysadmin' })
  expect(user.role).toBe('user')
  expect(user.email.value).toBe('a@b.com')
})
