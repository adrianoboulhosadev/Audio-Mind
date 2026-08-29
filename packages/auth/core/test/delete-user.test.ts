import { Errors } from 'shared'
import { AuthSession, DeleteUser, RegisterUser } from '../src'
import {
  UserRepositoryInMemory,
  HashProviderInMemory,
  AuthSessionRepositoryInMemory,
} from './in-memory'

async function setup() {
  const repository = new UserRepositoryInMemory()
  const sessions = new AuthSessionRepositoryInMemory()
  const hash = new HashProviderInMemory()
  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  const userId = user!.id.value

  // Two devices logged in, so the test can tell "revoked ONE session" from
  // "revoked the whole family".
  const expiresAt = new Date(Date.now() + 60_000)
  await sessions.save(new AuthSession({ userId, verifierHash: 'device-1', expiresAt }))
  await sessions.save(new AuthSession({ userId, verifierHash: 'device-2', expiresAt }))

  return { repository, sessions, userId, useCase: new DeleteUser(repository, sessions) }
}

test('erases the row — the identity stops existing, it is not just flagged', async () => {
  const { repository, userId, useCase } = await setup()

  await useCase.execute(userId)

  expect(await repository.findById(userId)).toBeNull()
  // And the address is free again: nothing is left holding it.
  expect(await repository.findByEmail('a@b.com')).toBeNull()
})

test('takes every open session with it', async () => {
  const { sessions, userId, useCase } = await setup()

  await useCase.execute(userId)

  expect(await sessions.findActiveByUser(userId)).toHaveLength(0)
})

test('answers USER_NOT_FOUND for an id that is not there', async () => {
  const { useCase } = await setup()

  await expect(useCase.execute('9d2f1b6e-0000-4000-8000-000000000000')).rejects.toMatchObject({
    code: Errors.USER_NOT_FOUND,
  })
})
