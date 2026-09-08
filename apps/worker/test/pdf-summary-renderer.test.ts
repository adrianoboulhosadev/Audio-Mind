import { mkdtempSync, readFileSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * The PDF is the product somebody keeps, and almost nothing about it fails
 * loudly: pdfkit draws a box over text, or off the page, without a word, and
 * neither check-types nor build looks at the file. What is covered here is the
 * part that DID break while this was written — the cursor left in the middle of
 * the mind map, and a footer written below the bottom margin creating a blank
 * page — plus the fallback for a summary whose bullets carry no label.
 *
 * `UPLOADS_DIR` has to be set BEFORE the module is imported: the renderer reads
 * it at import time (see uploads-path.ts).
 */
const UPLOADS = mkdtempSync(join(tmpdir(), 'pdf-renderer-test-'))
process.env.UPLOADS_DIR = UPLOADS

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PdfKitSummaryRenderer } = require('../src/pdf/pdfkit-summary-renderer')

const BASE = {
  recordingId: 'recording-1',
  recordingTitle: 'Reunião semanal.m4a',
  headline: 'Alinhamento de produto',
  overview: 'Primeiro parágrafo do resumo.\n\nSegundo parágrafo, com mais contexto do que foi dito.',
  topics: [
    'Prazo do lançamento: ficou adiado para depois do fechamento do mês, porque o financeiro só libera os números no dia 5.',
    'Migração em duas etapas: primeiro a cópia das tabelas, com escrita dupla por 48 horas, e só então o corte da leitura.',
  ],
  actionItems: ['Call com o financeiro: o Rafael marca até quinta.'],
  createdAt: new Date('2026-03-19T14:30:00Z'),
}

async function render(input: Record<string, unknown>): Promise<Buffer> {
  const url: string = await new PdfKitSummaryRenderer().render(input)
  // The port answers the PUBLIC path (/uploads/summaries/x.pdf); reading it back
  // through the same name is also a check that the two agree.
  return readFileSync(join(UPLOADS, 'summaries', url.split('/').pop() as string))
}

/** How many pages the file declares. Enough to catch the blank page a footer
 * below the margin used to add. */
function pageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
}

describe('PdfKitSummaryRenderer', () => {
  it('escreve um PDF de verdade, com o mapa e o texto no MESMO documento', async () => {
    const pdf = await render(BASE)

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    // O mapa é vetor, não imagem: o documento não carrega bitmap nenhum.
    expect(pdf.toString('latin1')).not.toContain('/Subtype /Image')
    expect(statSync(join(UPLOADS, 'summaries', 'recording-1.pdf')).size).toBeGreaterThan(3_000)
  })

  it('nao inventa uma pagina em branco no fim', async () => {
    // O rodapé mora ABAIXO da margem inferior, e responder texto ali fazia o
    // pdfkit abrir outra página — que saía com o rodapé e mais nada.
    const pdf = await render({ ...BASE, recordingId: 'recording-2' })

    expect(pageCount(pdf)).toBe(1)
  })

  it('desenha resumo antigo, sem rotulo nos bullets', async () => {
    const pdf = await render({
      ...BASE,
      recordingId: 'recording-3',
      topics: ['Uma frase solta, do jeito que o prompt antigo pedia'],
      actionItems: [],
    })

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('aguenta um resumo cheio, com bullets no teto do dominio', async () => {
    // 12 tópicos (o teto da entidade) com o texto no limite do VO: é o caso em
    // que o mapa não cabe na página e precisa ganhar a sua.
    const long = 'Rótulo comprido de teste: ' + 'palavra '.repeat(70)
    const pdf = await render({
      ...BASE,
      recordingId: 'recording-4',
      topics: Array.from({ length: 12 }, (_, index) => `${index} ${long}`),
      actionItems: Array.from({ length: 8 }, (_, index) => `Tarefa ${index}: ${long}`),
    })

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pageCount(pdf)).toBeGreaterThan(1)
  })
})
