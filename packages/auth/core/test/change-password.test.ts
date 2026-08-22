import { Errors } from 'shared'
import { ChangePassword, RegisterUser } from '../src'
import { UserRepositoryInMemory, HashProviderInMemory } from './in-memory'

async function setup() {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  const useCase = new ChangePassword(repository, hash)
  return { repository, hash, userId: user!.id.value, useCase }
}

test('replaces the hash when the old password checks out', async () => {
  const { repository, hash, userId, useCase } = await setup()

  await useCase.execute({ userId, oldPassword: 'Senha@123', newPassword: 'Nova@1234' })

  const user = await repository.findById(userId)
  expect(hash.compare('Nova@1234', user!.password!.value)).toBe(true)
})

test('rejects a wrong old password with INVALID_PASSWORD', async () => {
  const { userId, useCase } = await setup()

  await expect(
    useCase.execute({ userId, oldPassword: 'Errada@123', newPassword: 'Nova@1234' }),
  ).rejects.toMatchObject({ code: Errors.INVALID_PASSWORD })
})

test('rejects reusing the current password', async () => {
  const { userId, useCase } = await setup()

  await expect(
    useCase.execute({ userId, oldPassword: 'Senha@123', newPassword: 'Senha@123' }),
  ).rejects.toMatchObject({ code: Errors.PASSWORD_SAME_AS_PREVIOUS })
})

test('the new password still has to satisfy the policy', async () => {
  const { userId, useCase } = await setup()

  await expect(
    useCase.execute({ userId, oldPassword: 'Senha@123', newPassword: 'fraca' }),
  ).rejects.toMatchObject({ code: Errors.WEAK_PASSWORD })
})
