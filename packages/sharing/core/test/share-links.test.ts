import {
  CreateShareLink,
  GetShareLinkByTokenQuery,
  ListMyShareLinksQuery,
  RegisterShareLinkView,
  RevokeShareLink,
} from '../src'
import { ShareLinkRepositoryInMemory } from './in-memory'

const OWNER = 'ae0e9b2c-6f4a-4e0a-9f0b-91f1a8a5c001'
const OTHER = 'ae0e9b2c-6f4a-4e0a-9f0b-91f1a8a5c003'
const RECORDING = 'ae0e9b2c-6f4a-4e0a-9f0b-91f1a8a5c002'

function setup() {
  const repository = new ShareLinkRepositoryInMemory()
  return {
    repository,
    create: (input: Record<string, unknown> = {}) =>
      new CreateShareLink(repository).execute({ ownerId: OWNER, recordingId: RECORDING, ...input }),
    list: () => new ListMyShareLinksQuery(repository).execute({ ownerId: OWNER }),
    read: (token: string) => new GetShareLinkByTokenQuery(repository).execute(token),
  }
}

describe('CreateShareLink', () => {
  it('cada link é um segredo NOVO, pra poder cortar um sem cortar o outro', async () => {
    const { create, list } = setup()
    await create()
    await create()

    const links = await list()
    expect(links).toHaveLength(2)
    expect(links[0].token).not.toBe(links[1].token)
  })

  it('sem escolha de escopo, o link entrega só o resumo', async () => {
    const { create, list } = setup()
    await create()

    const [link] = await list()
    expect(link.includesTranscript).toBe(false)
    expect(link.includesAudio).toBe(false)
  })

  it('o áudio só entra quando é pedido explicitamente', async () => {
    const { create, list } = setup()
    await create({ includesAudio: true })

    expect((await list())[0].includesAudio).toBe(true)
  })
})

describe('GetShareLinkByTokenQuery', () => {
  it('token desconhecido não abre nada', async () => {
    const { read } = setup()
    await expect(read('a'.repeat(64))).rejects.toThrow()
  })

  it('link revogado para de abrir', async () => {
    const { create, list, read, repository } = setup()
    await create()
    const [link] = await list()
    await new RevokeShareLink(repository).execute({ shareLinkId: link.id, ownerId: OWNER })

    await expect(read(link.token)).rejects.toThrow()
  })

  it('link expirado para de abrir', async () => {
    const { create, list, read, repository } = setup()
    await create()
    const [created] = await list()
    // Envelhece a linha por baixo, como o tempo faria.
    const stored = await repository.findByToken(created.token)
    await repository.update(
      new (await import('../src')).ShareLink({
        ...stored!.props,
        expiresAt: new Date(Date.now() - 1000),
      }),
    )

    await expect(read(created.token)).rejects.toThrow()
  })
})

describe('RevokeShareLink', () => {
  it('link de outro dono responde como inexistente', async () => {
    const { create, list, repository } = setup()
    await create()
    const [link] = await list()

    await expect(
      new RevokeShareLink(repository).execute({ shareLinkId: link.id, ownerId: OTHER }),
    ).rejects.toThrow()
  })

  it('a linha SOBREVIVE à revogação — o dono precisa poder ver que existiu', async () => {
    const { create, list, repository } = setup()
    await create()
    const [link] = await list()
    await new RevokeShareLink(repository).execute({ shareLinkId: link.id, ownerId: OWNER })

    const [revoked] = await list()
    expect(revoked.revokedAt).not.toBeNull()
  })
})

describe('RegisterShareLinkView', () => {
  it('conta a abertura', async () => {
    const { create, list, repository } = setup()
    await create()
    const [link] = await list()

    await new RegisterShareLinkView(repository).execute(link.token)

    expect((await list())[0].viewCount).toBe(1)
  })

  it('token que não existe não quebra nada — a página já foi servida', async () => {
    const { repository } = setup()
    await expect(
      new RegisterShareLinkView(repository).execute('b'.repeat(64)),
    ).resolves.toBeUndefined()
  })
})
