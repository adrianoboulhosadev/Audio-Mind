import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import PDFDocument from 'pdfkit'
import {
  buildMindMap,
  splitBulletLabel,
  splitIntoParagraphs,
  PdfRenderer,
  PdfRendererInput,
} from '@summary/adapters'
import { SUMMARY_DIR, SUMMARY_SUBDIR, UPLOADS_URL_PREFIX } from './uploads-path'
import { PDF_COLORS, PDF_MIND_MAP_GEOMETRY, drawMindMap, pdfMeasure } from './mind-map-drawing'

/**
 * The PDF port, drawn with pdfkit (no headless browser, no template engine).
 *
 * The document is ONE thing: the prose, the mind map and the sections in the
 * same file, in the order somebody reads them — the map is not an attachment or
 * a separate image, it is the summary's shape, drawn as vector between the
 * overview and the detail.
 *
 * The file is named after the RECORDING, not after a fresh uuid: re-rendering
 * the same summary must overwrite its own document instead of leaving an
 * orphaned file nobody points at.
 *
 * Helvetica is the built-in font, and its WinAnsi encoding covers Portuguese
 * accents — worth stating, because the obvious "just use a nicer font" change
 * means shipping a font file with the image.
 */

const MARGIN = 56
const PAGE = { width: 595.28, height: 841.89 }
const CONTENT_WIDTH = PAGE.width - MARGIN * 2
const PAGE_BOTTOM = PAGE.height - MARGIN

/** Enough for a section title plus the first item under it, and for one item
 * (its label plus a couple of lines of explanation). Both are in points. */
const HEADING_WITH_ITEM = 96
/** The section title plus the space under it, so a drawing can be measured
 * together with the heading that announces it. */
const HEADING_HEIGHT = 22
const ITEM_SPACE = 64

const SECTIONS = {
  overview: 'Visão geral',
  map: 'Mapa mental',
  topics: 'Pontos principais',
  actions: 'Próximos passos',
}

export class PdfKitSummaryRenderer implements PdfRenderer {
  async render(input: PdfRendererInput): Promise<string> {
    await mkdir(SUMMARY_DIR, { recursive: true })

    const filename = `${input.recordingId}.pdf`
    const path = join(SUMMARY_DIR, filename)

    await this.draw(input, path)

    return `${UPLOADS_URL_PREFIX}${SUMMARY_SUBDIR}/${filename}`
  }

  private draw(input: PdfRendererInput, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // `bufferPages` is what allows the footer to say "página 2 de 4": the
      // total is only known after the last one is written.
      const document = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })
      const stream = createWriteStream(path)

      // The promise settles on the FILE, not on the document: `document.end()`
      // only finishes writing to the stream, and returning before the stream
      // closed would hand back a path to a half-written PDF.
      stream.on('finish', () => resolve())
      stream.on('error', reject)
      document.on('error', reject)
      document.pipe(stream)

      this.cover(document, input)
      this.overview(document, input.overview)
      this.mindMap(document, input)
      this.section(document, SECTIONS.topics, input.topics, PDF_COLORS.accent)
      this.section(document, SECTIONS.actions, input.actionItems, PDF_COLORS.good)
      this.footers(document, input)

      document.end()
    })
  }

  private cover(document: PDFKit.PDFDocument, input: PdfRendererInput): void {
    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(PDF_COLORS.accent)
      .text('AUDIO MIND', { characterSpacing: 1.6 })

    document.moveDown(0.6)
    document.font('Helvetica-Bold').fontSize(21).fillColor(PDF_COLORS.ink).text(input.headline)

    document.moveDown(0.35)
    document
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(PDF_COLORS.muted)
      .text(`${input.recordingTitle} · ${formatDate(input.createdAt)}`)

    // A rule under the title, in the accent: it is what makes the first page
    // read as a cover instead of as a page that starts mid-document.
    document.moveDown(0.8)
    const y = document.y
    document
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + CONTENT_WIDTH, y)
      .lineWidth(1.2)
      .strokeColor(PDF_COLORS.accent)
      .stroke()
    document.y = y + 18
  }

  private overview(document: PDFKit.PDFDocument, overview: string): void {
    this.heading(document, SECTIONS.overview, PDF_COLORS.accent)

    // Paragraph by paragraph: a single `text()` with newlines in it loses the
    // spacing between them. And what comes back is not always paragraphed — a
    // wall of text justified across the column is broken up here (see
    // splitIntoParagraphs), which is also what makes every summary written
    // before the instruction existed readable without reprocessing.
    const paragraphs = splitIntoParagraphs(overview)

    document.font('Helvetica').fontSize(10.5).fillColor(PDF_COLORS.ink2)
    paragraphs.forEach((paragraph, index) => {
      document.text(paragraph, { align: 'justify', lineGap: 2.5 })
      if (index < paragraphs.length - 1) document.moveDown(0.6)
    })
  }

  /**
   * The map, between the prose and the detail — where it earns its place: the
   * overview says what happened, the map shows the SHAPE of it, and the
   * sections below spell each branch out.
   */
  private mindMap(document: PDFKit.PDFDocument, input: PdfRendererInput): void {
    const map = buildMindMap(
      {
        headline: input.headline,
        groups: [
          { tone: 'topic', title: SECTIONS.topics, items: input.topics },
          { tone: 'action', title: SECTIONS.actions, items: input.actionItems },
        ],
      },
      {
        orientation: 'radial',
        geometry: PDF_MIND_MAP_GEOMETRY,
        measure: pdfMeasure(document),
      },
    )

    // A summary with no bullets has nothing to branch into, and a lone headline
    // in a box would read as a broken feature.
    if (!map) return

    document.moveDown(1.4)

    // The whole drawing moves to the next page rather than being cut in half
    // (half a mind map explains nothing) — and the decision is taken BEFORE the
    // heading is written, together with it. Writing the heading first and only
    // then deciding leaves it announcing nothing at the foot of the page, with a
    // second copy of itself on the next one.
    const needed = HEADING_HEIGHT + map.height
    const fitsAPage = map.height + HEADING_HEIGHT <= PAGE.height - MARGIN * 2
    if (document.y + needed > PAGE_BOTTOM && fitsAPage) document.addPage()

    this.heading(document, SECTIONS.map, PDF_COLORS.accent)
    this.legend(document, map.legend)

    // The cursor has to be remembered BEFORE drawing: every label the map writes
    // is a `text()` call, and pdfkit advances its own cursor on each one — inside
    // the map's transform, at that. Trusting it afterwards is what wrote the next
    // section on top of the drawing.
    const top = document.y
    const height = drawMindMap(document, map, {
      x: MARGIN,
      y: top,
      maxWidth: CONTENT_WIDTH,
      maxHeight: PAGE_BOTTOM - top,
    })
    document.x = MARGIN
    document.y = top + height
  }

  /**
   * One section of bullets. Each item is written as the model was asked to
   * produce it — "Rótulo: explicação" — with the label in bold on its own line
   * and the explanation as a paragraph under it. An item that came without a
   * label (an older summary, or a model that ignored the shape) is printed
   * whole, which is why the split has to be tolerant.
   *
   * An empty section is omitted entirely: a heading over nothing reads like the
   * document failed, and "no action items" is a legitimate outcome.
   */
  private section(
    document: PDFKit.PDFDocument,
    heading: string,
    items: string[],
    color: string,
  ): void {
    if (!items.length) return

    document.moveDown(1.4)
    // A heading needs room for the heading AND the first item under it: pushing
    // only the item to the next page leaves a section title alone at the foot of
    // the previous one, announcing nothing.
    if (document.y > PAGE_BOTTOM - HEADING_WITH_ITEM) document.addPage()
    this.heading(document, heading, color)

    items.forEach((item) => {
      const { label, detail } = splitBulletLabel(item)

      // Never leave a label alone at the foot of a page with its explanation
      // over the fold either.
      if (document.y > PAGE_BOTTOM - ITEM_SPACE) document.addPage()

      const top = document.y
      document
        .circle(MARGIN + 3, top + 5, 2.5)
        .fillColor(color)
        .fill()

      if (label) {
        document
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(PDF_COLORS.ink)
          .text(label, MARGIN + 14, top, { width: CONTENT_WIDTH - 14 })
        document.moveDown(0.2)
        document
          .font('Helvetica')
          .fontSize(10.5)
          .fillColor(PDF_COLORS.ink2)
          .text(detail, MARGIN + 14, document.y, {
            width: CONTENT_WIDTH - 14,
            align: 'justify',
            lineGap: 2,
          })
      } else {
        document
          .font('Helvetica')
          .fontSize(10.5)
          .fillColor(PDF_COLORS.ink2)
          .text(detail, MARGIN + 14, top, { width: CONTENT_WIDTH - 14, lineGap: 2 })
      }

      document.moveDown(0.7)
      // The text was drawn in an indented column; the cursor goes back to the
      // margin, or the next heading starts under the bullets.
      document.x = MARGIN
    })
  }

  /**
   * What each colour on the map means. The radial map has no room for a section
   * node, so the section became the branch's COLOUR — and a colour that is not
   * named anywhere is decoration, not information.
   */
  private legend(document: PDFKit.PDFDocument, entries: { tone: string; title: string }[]): void {
    if (entries.length === 0) return

    const y = document.y
    let x = MARGIN

    entries.forEach((entry) => {
      const color = entry.tone === 'action' ? PDF_COLORS.good : PDF_COLORS.accent
      document.circle(x + 2.5, y + 4, 2.5).fillColor(color).fill()
      document
        .font('Helvetica')
        .fontSize(8)
        .fillColor(PDF_COLORS.muted)
        .text(entry.title, x + 9, y, { lineBreak: false })
      x += 9 + document.widthOfString(entry.title) + 16
    })

    document.x = MARGIN
    document.y = y + 14
  }

  private heading(document: PDFKit.PDFDocument, text: string, color: string): void {
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(color)
      .text(text.toUpperCase(), MARGIN, document.y, { characterSpacing: 1.1 })
    document.moveDown(0.55)
  }

  /**
   * The same line at the foot of every page, written at the END: the page count
   * does not exist until the last one has been laid out.
   */
  private footers(document: PDFKit.PDFDocument, input: PdfRendererInput): void {
    const range = document.bufferedPageRange()

    for (let index = 0; index < range.count; index++) {
      document.switchToPage(range.start + index)
      // The footer lives BELOW the bottom margin, and pdfkit answers text down
      // there by starting a new page — which is how a footer produced an extra
      // blank page with a footer on it. Dropping the margin on the page being
      // stamped is the documented way out.
      document.page.margins.bottom = 0
      const y = PAGE.height - MARGIN + 14

      document
        .font('Helvetica')
        .fontSize(8)
        .fillColor(PDF_COLORS.muted)
        .text(`Audio Mind · ${input.recordingTitle}`, MARGIN, y, {
          width: CONTENT_WIDTH * 0.7,
          lineBreak: false,
        })
        .text(`${index + 1} de ${range.count}`, MARGIN + CONTENT_WIDTH * 0.7, y, {
          width: CONTENT_WIDTH * 0.3,
          align: 'right',
          lineBreak: false,
        })
    }

    // Said once, on the last page: this document was written by a model from a
    // transcript, and the reader deserves to know that without it shouting on
    // every page.
    document.switchToPage(range.start + range.count - 1)
    document
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(PDF_COLORS.muted)
      .text('Gerado automaticamente pelo Audio Mind a partir da transcrição do áudio.', MARGIN, PAGE.height - MARGIN + 24, {
        width: CONTENT_WIDTH,
        lineBreak: false,
      })
  }
}

function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}
