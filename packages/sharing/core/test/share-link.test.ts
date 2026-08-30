import { ShareLink, ShareScope, ShareToken, expirationFor, toShareWindow } from '../src'

const OWNER = 'ae0e9b2c-6f4a-4e0a-9f0b-91f1a8a5c001'
const RECORDING = 'ae0e9b2c-6f4a-4e0a-9f0b-91f1a8a5c002'

function build(props: Record<string, unknown> = {}): ShareLink {
  return new ShareLink({ ownerId: OWNER, recordingId: RECORDING, ...props })
}

describe('ShareToken', () => {
  it('gera um segredo de 64 hex quando não vem nenhum', () => {
    expect(new ShareToken().value).toMatch(ShareToken.FORMAT)
  })

  it('dois tokens seguidos nunca são iguais', () => {
    expect(new ShareToken().value).not.toBe(new ShareToken().value)
  })

  it('recusa um token com outro formato', () => {
    expect(() => new ShareToken('curto-demais')).toThrow()
  })
})

describe('ShareWindow', () => {
  it('janela desconhecida é a MAIS CURTA — fail-closed', () => {
    expect(toShareWindow('para-sempre')).toBe('24h')
    expect(toShareWindow(undefined)).toBe('24h')
    expect(toShareWindow('30d')).toBe('30d')
  })

  it('cada janela dá uma validade maior que a anterior', () => {
    expect(expirationFor('7d').getTime()).toBeGreaterThan(expirationFor('24h').getTime())
    expect(expirationFor('30d').getTime()).toBeGreaterThan(expirationFor('7d').getTime())
  })
})

describe('ShareLink', () => {
  it('sem escopo, entrega SÓ o resumo', () => {
    const link = build()
    expect(link.scope.transcript).toBe(false)
    expect(link.scope.audio).toBe(false)
    expect(ShareScope.summaryOnly().audio).toBe(false)
  })

  it('nasce válido e com validade — não existe link eterno', () => {
    const link = build()
    expect(link.isUsable()).toBe(true)
    expect(link.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('recusa uma validade além da janela mais longa', () => {
    const daquiUmAno = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    expect(() => build({ expiresAt: daquiUmAno })).toThrow()
  })

  it('expirado deixa de ser usável', () => {
    const link = build({ expiresAt: new Date(Date.now() - 1000) })
    expect(link.isExpired()).toBe(true)
    expect(link.isUsable()).toBe(false)
  })

  it('revogado morre na hora, mesmo dentro da validade', () => {
    const link = build()
    link.revoke()

    expect(link.isRevoked).toBe(true)
    expect(link.isExpired()).toBe(false)
    expect(link.isUsable()).toBe(false)
  })

  it('revogar duas vezes guarda a PRIMEIRA hora', () => {
    const link = build()
    link.revoke()
    const first = link.revokedAt
    link.revoke()

    expect(link.revokedAt).toBe(first)
  })

  it('conta as aberturas, sem guardar quem abriu', () => {
    const link = build()
    link.registerView()
    link.registerView()

    expect(link.viewCount).toBe(2)
    expect(link.lastViewedAt).toBeInstanceOf(Date)
  })

  it('exige dono e gravação', () => {
    expect(() => new ShareLink({ recordingId: RECORDING })).toThrow()
    expect(() => new ShareLink({ ownerId: OWNER })).toThrow()
  })
})
