import { Errors } from 'shared'
import { RegisterUser, UserRegistered } from '../src'
import { UserRepositoryInMemory, HashProviderInMemory, EventPublisherInMemory } from './in-memory'

function setup() {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  const publisher = new EventPublisherInMemory()
  const useCase = new RegisterUser(repository, hash, publisher)
  return { repository, hash, publisher, useCase }
}

test('registers the user, normalizes the email and stores the password as a hash', async () => {
  const { repository, useCase } = setup()

  await useCase.execute({ email: '  Adriano@Email.com.BR ', password: 'Senha@123', name: ' Adriano ' })

  const user = await repository.findByEmail('adriano@email.com.br')
  expect(user).not.toBeNull()
  expect(user!.email.value).toBe('adriano@email.com.br')
  expect(user!.password!.value).not.toBe('Senha@123')
  expect(user!.password!.value).toMatch(/^\$2a\$/)
  expect(user!.name).toBe('Adriano')
  expect(user!.active).toBe(true)
})

test('publishes UserRegistered after persisting', async () => {
  const { publisher, useCase } = setup()

  await useCase.execute({ email: 'a@b.com', password: 'Senha@123' })

  expect(publisher.published).toHaveLength(1)
  expect(publisher.published[0]).toBeInstanceOf(UserRegistered)
})

test('rejects an invalid email with INVALID_EMAIL', async () => {
  const { useCase } = setup()
  await expect(
    useCase.execute({ email: 'not-an-email', password: 'Senha@123' }),
  ).rejects.toMatchObject({ code: Errors.INVALID_EMAIL })
})

test('rejects a weak password with WEAK_PASSWORD', async () => {
  const { useCase } = setup()
  await expect(useCase.execute({ email: 'a@b.com', password: '123' })).rejects.toMatchObject({
    code: Errors.WEAK_PASSWORD,
  })
})

test('rejects a duplicated email with USER_ALREADY_EXISTS', async () => {
  const { useCase } = setup()
  await useCase.execute({ email: 'a@b.com', password: 'Senha@123' })

  await expect(useCase.execute({ email: 'A@B.com', password: 'Outra@123' })).rejects.toMatchObject({
    code: Errors.USER_ALREADY_EXISTS,
  })
})
