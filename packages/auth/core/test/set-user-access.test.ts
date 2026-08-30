import { Errors } from 'shared'
import { AuthSession, ListUsersQuery, RegisterUser, SetUserAccess } from '../src'
import {
  AuthSessionRepositoryInMemory,
  HashProviderInMemory,
  UserRepositoryInMemory,
} from './in-memory'

async function setup() {
  const repository = new UserRepositoryInMemory()
  const sessions = new AuthSessionRepositoryInMemory()
  const hash = new HashProviderInMemory()

  await new RegisterUser(repository, hash).execute({ email: 'admin@b.com', password: 'Senha@123' })
  await new RegisterUser(repository, hash).execute({ email: 'gente@b.com', password: 'Senha@123' })

  const admin = (await repository.findByEmail('admin@b.com'))!
  const target = (await repository.findByEmail('gente@b.com'))!

  // Dois aparelhos logados, pra dar pra ver que desativar derruba os DOIS.
  const expiresAt = new Date(Date.now() + 60_000)
  await sessions.save(
    new AuthSession({ userId: target.id.value, verifierHash: 'device-1', expiresAt }),
  )
  await sessions.save(
    new AuthSession({ userId: target.id.value, verifierHash: 'device-2', expiresAt }),
  )

  return {
    repository,
    sessions,
    adminId: admin.id.value,
    targetId: target.id.value,
    set: (input: { userId: string; role?: string; active?: boolean; actorId?: string }) =>
      new SetUserAccess(repository, sessions).execute({
        actorId: input.actorId ?? admin.id.value,
        userId: input.userId,
        role: input.role,
        active: input.active,
      }),
  }
}

describe('SetUserAccess', () => {
  it('promove outra pessoa a admin', async () => {
    const { set, repository, targetId } = await setup()
    await set({ userId: targetId, role: 'admin' })

    expect((await repository.findById(targetId))!.isAdmin).toBe(true)
  })

  it('papel desconhecido lê como usuário comum — FAIL-CLOSED', async () => {
    const { set, repository, targetId } = await setup()
    await set({ userId: targetId, role: 'superadmin' })

    expect((await repository.findById(targetId))!.role).toBe('user')
  })

  it('NUNCA na própria conta — não dá pra se trancar do lado de fora', async () => {
    const { set, adminId } = await setup()

    await expect(set({ userId: adminId, role: 'user' })).rejects.toThrow(
      expect.objectContaining({ code: Errors.CANNOT_CHANGE_OWN_ACCESS }),
    )
  })

  it('conta inexistente responde não encontrado', async () => {
    const { set } = await setup()

    await expect(
      set({ userId: '4ac1f1d2-6f4a-4e0a-9f0b-91f1a8a5c999' }),
    ).rejects.toThrow(expect.objectContaining({ code: Errors.USER_NOT_FOUND }))
  })

  it('desativar derruba TODAS as sessões — senão a conta segue viva onde já estava logada', async () => {
    const { set, sessions, repository, targetId } = await setup()
    expect(await sessions.findActiveByUser(targetId)).toHaveLength(2)

    await set({ userId: targetId, active: false })

    expect((await repository.findById(targetId))!.active).toBe(false)
    expect(await sessions.findActiveByUser(targetId)).toHaveLength(0)
  })

  it('reativar abre a porta de novo, sem apagar nada', async () => {
    const { set, repository, targetId } = await setup()
    await set({ userId: targetId, active: false })
    await set({ userId: targetId, active: true })

    expect((await repository.findById(targetId))!.active).toBe(true)
  })
})

describe('ListUsersQuery', () => {
  it('lista todo mundo e filtra por e-mail', async () => {
    const { repository } = await setup()
    const all = await new ListUsersQuery(repository).execute({})
    expect(all).toHaveLength(2)

    const filtered = await new ListUsersQuery(repository).execute({ term: 'gente' })
    expect(filtered.map((user) => user.email)).toEqual(['gente@b.com'])
  })
})
