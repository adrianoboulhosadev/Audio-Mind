import { splitIntoParagraphs, splitBulletLabel } from '@summary/adapters'

/**
 * O que o modelo MANDA nem sempre é o que foi pedido, e o documento precisa
 * ficar legível dos dois jeitos. Foi assim que o primeiro resumo real voltou:
 * um bloco único de 250 palavras, justificado numa coluna A4 inteira.
 */

const SENTENCE = 'O professor explicou o conceito com um exemplo prático do dia a dia da obra. '

describe('splitIntoParagraphs', () => {
  it('respeita os paragrafos quando o modelo mandou as quebras', () => {
    expect(splitIntoParagraphs('Primeiro.\n\nSegundo.\n\nTerceiro.')).toEqual([
      'Primeiro.',
      'Segundo.',
      'Terceiro.',
    ])
  })

  it('quebra o bloco unico em paragrafos, nas fronteiras de FRASE', () => {
    const wall = SENTENCE.repeat(12).trim()
    const paragraphs = splitIntoParagraphs(wall)

    expect(paragraphs.length).toBeGreaterThan(1)
    // Nenhuma palavra some, nada é reordenado: só entraram quebras.
    expect(paragraphs.join(' ')).toBe(wall)
    paragraphs.forEach((paragraph) => expect(paragraph.trim()).toBe(paragraph))
  })

  it('nao quebra um paragrafo apenas longo', () => {
    const paragraph = SENTENCE.repeat(4).trim()
    expect(splitIntoParagraphs(paragraph)).toEqual([paragraph])
  })

  it('nao deixa uma frase solta como ultimo paragrafo', () => {
    const paragraphs = splitIntoParagraphs(`${SENTENCE.repeat(11)}Fim.`)
    expect(paragraphs[paragraphs.length - 1].length).toBeGreaterThan(60)
  })

  it('texto vazio nao vira paragrafo vazio', () => {
    expect(splitIntoParagraphs('   \n\n  ')).toEqual([])
  })
})

describe('splitBulletLabel', () => {
  it('separa "Rotulo: explicacao"', () => {
    expect(splitBulletLabel('Prazo do lançamento: ficou adiado para o dia 5.')).toEqual({
      label: 'Prazo do lançamento',
      detail: 'ficou adiado para o dia 5.',
    })
  })

  it('dois-pontos no MEIO da frase nao e rotulo', () => {
    // Senão um bullet antigo viraria um nó de mapa com meia frase dentro.
    const text = 'o time decidiu o seguinte: esperar o fechamento do mês e revisar depois'
    expect(splitBulletLabel(text).label).toBeNull()
    expect(splitBulletLabel(text).detail).toBe(text)
  })

  it('bullet antigo, sem rotulo nenhum, sai inteiro', () => {
    expect(splitBulletLabel('Lançamento adiado')).toEqual({
      label: null,
      detail: 'Lançamento adiado',
    })
  })
})
