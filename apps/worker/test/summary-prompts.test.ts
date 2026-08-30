import { templateFor } from '../src/extraction/summary-prompts'

/**
 * O que se testa aqui é a escolha do template, não o texto do prompt: o texto é
 * afinado com o tempo, a REGRA é que um tipo desconhecido nunca caia no template
 * de outro.
 */
describe('templateFor', () => {
  it('cada tipo tem instruções próprias pro que procurar', () => {
    expect(templateFor('class').actionItems).toContain('estudar')
    expect(templateFor('medical').actionItems).toContain('Medicação'.toLowerCase())
    expect(templateFor('meeting').actionItems).toContain('prazo')
  })

  it('tipo desconhecido, vazio ou ausente cai no genérico — FAIL-CLOSED', () => {
    const generic = templateFor()
    expect(templateFor('consulta-do-vizinho')).toBe(generic)
    expect(templateFor('')).toBe(generic)
    expect(generic.context).toContain('qualquer tipo')
  })
})
