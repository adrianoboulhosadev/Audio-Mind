import { buildMindMap, splitBulletLabel, wrapText, type MindMapNode } from '@summary/adapters'

/**
 * The mind map is drawn from these numbers, and SVG forgives nothing: a box
 * placed on top of another still renders, just unreadable — and no type-check
 * or build would ever notice. So what is tested here is the geometry itself
 * (nothing overlaps, everything is inside the viewBox) plus the wrapping, which
 * is the only place a label can silently lose its text.
 */

const HEADLINE = 'Reunião de alinhamento do time de produto'
const TOPICS = [
  'O time decidiu adiar o lançamento da nova tela de cobrança para depois do fechamento do mês',
  'A migração do banco vai acontecer em duas etapas, com o rollback pronto antes da primeira',
  'Ficou combinado que o suporte entra na régua de comunicação a partir da semana que vem',
]
const ACTIONS = ['Marcar a call com o financeiro', 'Escrever o plano de rollback']

function boxesOverlap(a: MindMapNode, b: MindMapNode): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  )
}

describe('wrapText', () => {
  it('quebra em palavras inteiras dentro do limite', () => {
    expect(wrapText('um dois tres quatro', 10, 4)).toEqual(['um dois', 'tres', 'quatro'])
  })

  it('elide o que passa do numero de linhas, sem estourar a largura', () => {
    const lines = wrapText('um dois tres quatro cinco seis sete oito', 10, 2)

    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(10))
  })

  it('quebra a forca uma palavra maior que a linha', () => {
    // Sem isso o texto sai do retangulo: SVG nao recorta nada por padrao.
    const lines = wrapText('antidisestablishmentarianismo', 8, 6)

    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(8))
    expect(lines.join('')).toContain('antidise')
  })

  it('nao perde texto quando tudo cabe', () => {
    expect(wrapText('cabe inteiro aqui', 40, 3)).toEqual(['cabe inteiro aqui'])
  })
})

describe.each(['wide', 'narrow'] as const)('buildMindMap (%s)', (orientation) => {
  const map = buildMindMap(
    { headline: HEADLINE, groups: [
      { tone: 'topic', title: 'Pontos principais', items: TOPICS },
      { tone: 'action', title: 'Próximos passos', items: ACTIONS },
    ] },
    { orientation },
  )!

  it('desenha a raiz, as duas secoes e um no por bullet', () => {
    expect(map.nodes).toHaveLength(1 + 2 + TOPICS.length + ACTIONS.length)
    expect(map.nodes.filter((node) => node.kind === 'root')).toHaveLength(1)
    expect(map.nodes.filter((node) => node.kind === 'branch')).toHaveLength(2)
  })

  it('nao sobrepoe nenhum par de caixas', () => {
    map.nodes.forEach((node, index) => {
      map.nodes.slice(index + 1).forEach((other) => {
        expect({ pair: `${node.id} x ${other.id}`, overlap: boxesOverlap(node, other) }).toEqual({
          pair: `${node.id} x ${other.id}`,
          overlap: false,
        })
      })
    })
  })

  it('mantem tudo dentro do viewBox', () => {
    map.nodes.forEach((node) => {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.x + node.width).toBeLessThanOrEqual(map.width)
      expect(node.y + node.height).toBeLessThanOrEqual(map.height)
    })
  })

  it('escreve o texto dentro da propria caixa', () => {
    map.nodes.forEach((node) => {
      expect(node.textX).toBeGreaterThan(node.x)
      expect(node.textY).toBeGreaterThan(node.y)
      const lastBaseline = node.textY + (node.lines.length - 1) * node.lineHeight
      expect(lastBaseline).toBeLessThanOrEqual(node.y + node.height)
    })
  })

  it('liga cada no ao pai: uma aresta por secao e uma por bullet', () => {
    // A stacked layout also draws the spine that runs down the gutter, so the
    // count is a floor, not an equality.
    expect(map.edges.length).toBeGreaterThanOrEqual(2 + TOPICS.length + ACTIONS.length)
    map.edges.forEach((edge) => expect(edge.path).toMatch(/^M -?\d/))
  })
})

describe('buildMindMap sem o que desenhar', () => {
  it('nao devolve mapa quando o resumo nao tem bullet nenhum', () => {
    const map = buildMindMap(
      {
        headline: HEADLINE,
        groups: [
          { tone: 'topic', title: 'Pontos principais', items: [] },
          { tone: 'action', title: 'Próximos passos', items: [] },
        ],
      },
      { orientation: 'wide' },
    )

    // Uma headline sozinha num retangulo nao e um mapa — e desenhar isso faria
    // parecer que a funcionalidade quebrou.
    expect(map).toBeNull()
  })

  it('desenha com uma secao so, quando a outra veio vazia', () => {
    const map = buildMindMap(
      {
        headline: HEADLINE,
        groups: [
          { tone: 'topic', title: 'Pontos principais', items: TOPICS },
          { tone: 'action', title: 'Próximos passos', items: [] },
        ],
      },
      { orientation: 'wide' },
    )!

    expect(map.nodes.filter((node) => node.kind === 'branch')).toHaveLength(1)
    expect(map.nodes).toHaveLength(1 + 1 + TOPICS.length)
  })
})
