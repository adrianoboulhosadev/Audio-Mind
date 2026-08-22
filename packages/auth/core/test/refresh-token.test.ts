import { Errors } from 'shared'
import { LoginUser, RefreshToken, RegisterUser } from '../src'
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
  const login = new LoginUser(repository, hash, jwt, sessions)
  const useCase = new RefreshToken(jwt, sessions, hash, repository)
  return { repository, sessions, login, useCase }
}

test('rotates the pair keeping the SAME session (family)', async () => {
  const { sessions, login, useCase } = await setup()
  const first = await login.execute({ email: 'a@b.com', password: 'Senha@123' })

  const rotated = await useCase.execute({ token: first.refreshToken }, SECRET)

  expect(rotated.refreshToken).not.toBe(first.refreshToken)
  expect(sessions.size).toBe(1)
})

test('replaying an already-rotated refresh tears the whole family down', async () => {
  const { sessions, login, useCase } = await setup()
  const first = await login.execute({ email: 'a@b.com', password: 'Senha@123' })
  await useCase.execute({ token: first.refreshToken }, SECRET)

  await expect(useCase.execute({ token: first.refreshToken }, SECRET)).rejects.toMatchObject({
    code: Errors.INVALID_SESSION,
  })
  expect(sessions.size).toBe(0)
})

test('a tampered/foreign-signed token is refused', async () => {
  const { login, useCase } = await setup()
  const tokens = await login.execute({ email: 'a@b.com', password: 'Senha@123' })

  await expect(useCase.execute({ token: tokens.refreshToken }, 'another-secret')).rejects.toMatchObject(
    { code: Errors.INVALID_SESSION },
  )
})

test('a deactivated account cannot renew itself even holding a valid refresh', async () => {
  const { repository, login, useCase } = await setup()
  const tokens = await login.execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  await repository.deactivate(user!.id.value)

  await expect(useCase.execute({ token: tokens.refreshToken }, SECRET)).rejects.toMatchObject({
    code: Errors.INVALID_SESSION,
  })
})
