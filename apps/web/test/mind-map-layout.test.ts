import { buildMindMap, leafLabel, splitBulletLabel, wrapText, type MindMapNode } from '@summary/adapters'

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

describe.each(['radial', 'narrow'] as const)('buildMindMap (%s)', (orientation) => {
  const map = buildMindMap(
    { headline: HEADLINE, groups: [
      { tone: 'topic', title: 'Pontos principais', items: TOPICS },
      { tone: 'action', title: 'Próximos passos', items: ACTIONS },
    ] },
    { orientation },
  )!

  it('desenha a raiz e um no por bullet', () => {
    // O radial nao tem no de secao (a secao virou COR, com legenda); o
    // empilhado tem. Os dois desenham uma folha por bullet.
    expect(map.nodes.filter((node) => node.kind === 'root')).toHaveLength(1)
    expect(map.nodes.filter((node) => node.kind === 'leaf')).toHaveLength(
      TOPICS.length + ACTIONS.length,
    )
    expect(map.legend.map((entry) => entry.tone)).toEqual(
      orientation === 'radial' ? ['topic', 'action'] : [],
    )
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

  it('escreve o texto dentro da area do proprio no', () => {
    // A folha do radial NAO tem caixa (e rotulo sobre o galho), entao o texto
    // comeca na borda dela; a raiz tem padding. Nos dois casos, o que nao pode
    // e a ultima linha cair pra fora da area medida.
    map.nodes.forEach((node) => {
      expect(node.textX).toBeGreaterThanOrEqual(node.x)
      expect(node.textY).toBeGreaterThan(node.y)
      const lastBaseline = node.textY + (node.lines.length - 1) * node.lineHeight
      expect(lastBaseline).toBeLessThanOrEqual(node.y + node.height + node.fontSize)
    })
  })

  it('liga cada folha ao centro', () => {
    // O radial desenha ramo + galho por folha; o empilhado desenha a espinha
    // alem das ligacoes. Em ambos o piso e uma aresta por bullet.
    expect(map.edges.length).toBeGreaterThanOrEqual(TOPICS.length + ACTIONS.length)
    map.edges.forEach((edge) => expect(edge.path).toMatch(/^M -?\d/))
  })

  it('nenhuma aresta aponta pra fora do desenho', () => {
    const points = map.edges.flatMap((edge) =>
      edge.segments.flatMap((segment) =>
        segment.kind === 'ribbon'
          ? [segment.out.from, segment.out.to, segment.tip, segment.back.to]
          : [segment.from, segment.to],
      ),
    )

    points.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(map.width)
      expect(y).toBeLessThanOrEqual(map.height)
    })
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
      { orientation: 'radial' },
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
      { orientation: 'radial' },
    )!

    // Com uma secao so, o radial reparte as folhas entre os DOIS lados: leque
    // num lado e nada no outro e uma lista que aprendeu a curvar.
    expect(map.nodes.filter((node) => node.kind === 'leaf')).toHaveLength(TOPICS.length)
    const middle = map.width / 2
    expect(map.nodes.some((node) => node.kind === 'leaf' && node.x < middle)).toBe(true)
    expect(map.nodes.some((node) => node.kind === 'leaf' && node.x > middle)).toBe(true)
  })
})

describe('leafLabel', () => {
  it('usa o rotulo quando o bullet tem um', () => {
    expect(leafLabel('Prazo do lançamento: ficou adiado para o dia 5.')).toBe('Prazo do lançamento')
  })

  it('encurta o bullet que veio SEM rotulo, em vez de jogar a frase no no', () => {
    // Caso real: dez palavras antes dos dois-pontos, entao nao e rotulo — e a
    // frase inteira num no do mapa vira paragrafo dentro de uma caixa.
    const real =
      'Estudar o documento enviado sobre definição de acidente de trabalho: revisar o material para entender a diferença.'
    const label = leafLabel(real)

    expect(splitBulletLabel(real).label).toBeNull()
    expect(label.split(/\s+/).length).toBeLessThanOrEqual(6)
    expect(label.endsWith('…')).toBe(true)
    expect(real.startsWith(label.replace('…', ''))).toBe(true)
  })

  it('bullet curto sem rotulo sai inteiro, sem reticencia', () => {
    expect(leafLabel('Lançamento adiado')).toBe('Lançamento adiado')
  })
})
