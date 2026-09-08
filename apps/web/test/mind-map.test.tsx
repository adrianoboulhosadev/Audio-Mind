import { render, screen } from '@testing-library/react'
import { MindMap } from '@/components/mind-map'

/**
 * The contract of the drawing, not its pixels.
 *
 * The map ELIDES a long bullet to keep it inside its box, so the whole text has
 * to survive somewhere — it lives in the `<title>` of each node, which is both
 * the tooltip and the accessible name. A refactor that drops it would look
 * perfect on screen and quietly take the text away from anyone who cannot read
 * a 12px diagram.
 */

// Do tamanho que o dominio de fato permite (SummaryBullet.MAX_LENGTH = 300):
// e esse bullet que nao cabe em caixa nenhuma dos dois layouts.
const LONG_TOPIC =
  'O time decidiu adiar o lançamento da nova tela de cobrança para depois do fechamento do mês, porque o financeiro ainda está fechando o trimestre e não teria como validar os números a tempo, e além disso a migração do banco precisa acontecer antes, com o plano de rollback escrito e revisado por alguém.'

// jsdom has no matchMedia, and the hook reads it to choose the layout.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
})

describe('MindMap', () => {
  it('guarda o texto INTEIRO de um bullet cortado no desenho', () => {
    render(<MindMap headline="Reunião de produto" topics={[LONG_TOPIC]} actionItems={[]} />)

    const node = Array.from(document.querySelectorAll('svg g')).find(
      (group) => group.querySelector('title')?.textContent === LONG_TOPIC,
    )

    expect(node).toBeDefined()
    // E o que foi DESENHADO nessa caixa é mesmo menor que o texto todo (senão o
    // teste acima passaria por acidente, com o bullet inteiro cabendo nela).
    const painted = Array.from(node!.querySelectorAll('tspan'))
      .map((line) => line.textContent ?? '')
      .join(' ')
    expect(painted.length).toBeLessThan(LONG_TOPIC.length)
    expect(painted).toContain('…')
  })

  it('desenha um no por bullet, mais a raiz e as secoes', () => {
    render(
      <MindMap
        headline="Reunião de produto"
        topics={['Adiar o lançamento', 'Migrar o banco em duas etapas']}
        actionItems={['Marcar a call com o financeiro']}
      />,
    )

    expect(screen.getByRole('img', { name: /mapa mental de reunião de produto/i })).toBeInTheDocument()
    expect(document.querySelectorAll('svg title')).toHaveLength(1 + 2 + 3)
  })

  it('nao desenha nada quando o resumo nao tem bullet', () => {
    const { container } = render(<MindMap headline="Reunião de produto" topics={[]} actionItems={[]} />)

    // Um card vazio com um retangulo dentro faria parecer defeito.
    expect(container).toBeEmptyDOMElement()
  })
})
