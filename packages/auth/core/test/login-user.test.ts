import { Errors } from 'shared'
import { LoginUser, RegisterUser } from '../src'
import {
  UserRepositoryInMemory,
  HashProviderInMemory,
  JwtProviderInMemory,
  AuthSessionRepositoryInMemory,
} from './in-memory'

const SECRET = 'test-secret'

async function setup() {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  const jwt = new JwtProviderInMemory(SECRET)
  const sessions = new AuthSessionRepositoryInMemory()
  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const useCase = new LoginUser(repository, hash, jwt, sessions)
  return { repository, hash, jwt, sessions, useCase }
}

test('issues the token pair and opens ONE session per login (multi-device)', async () => {
  const { sessions, useCase } = await setup()

  const first = await useCase.execute({ email: 'a@b.com', password: 'Senha@123' })
  const second = await useCase.execute({ email: 'a@b.com', password: 'Senha@123' })

  expect(first.accessToken).toBeDefined()
  expect(first.refreshToken).not.toBe(second.refreshToken)
  expect(sessions.size).toBe(2)
})

test('stores only the HASH of the refresh, never the token itself', async () => {
  const { repository, hash, sessions, useCase } = await setup()

  const tokens = await useCase.execute({ email: 'a@b.com', password: 'Senha@123' })

  const user = await repository.findByEmail('a@b.com')
  const [session] = await sessions.findActiveByUser(user!.id.value)
  expect(session.verifierHash).not.toBe(tokens.refreshToken)
  expect(hash.compareToken(tokens.refreshToken, session.verifierHash)).toBe(true)
})

test('answers the SAME generic error for unknown email and wrong password', async () => {
  const { useCase } = await setup()

  await expect(useCase.execute({ email: 'nobody@b.com', password: 'Senha@123' })).rejects.toMatchObject(
    { code: Errors.INVALID_EMAIL_OR_PASSWORD },
  )
  await expect(useCase.execute({ email: 'a@b.com', password: 'Errada@123' })).rejects.toMatchObject({
    code: Errors.INVALID_EMAIL_OR_PASSWORD,
  })
})

test('a deactivated account looks exactly like a wrong password', async () => {
  const { repository, useCase } = await setup()
  const user = await repository.findByEmail('a@b.com')
  await repository.deactivate(user!.id.value)

  await expect(useCase.execute({ email: 'a@b.com', password: 'Senha@123' })).rejects.toMatchObject({
    code: Errors.INVALID_EMAIL_OR_PASSWORD,
  })
})
