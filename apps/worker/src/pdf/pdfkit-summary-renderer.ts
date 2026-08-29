import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import PDFDocument from 'pdfkit'
import { PdfRenderer, PdfRendererInput } from '@summary/adapters'
import { SUMMARY_DIR, SUMMARY_SUBDIR, UPLOADS_URL_PREFIX } from './uploads-path'

/**
 * The PDF port, drawn with pdfkit (no headless browser, no template engine —
 * this document is a title, some prose and two lists).
 *
 * The file is named after the RECORDING, not after a fresh uuid: re-rendering
 * the same summary must overwrite its own document instead of leaving an
 * orphaned file nobody points at.
 *
 * Helvetica is the built-in font, and its WinAnsi encoding covers Portuguese
 * accents — worth stating, because the obvious "just use a nicer font" change
 * means shipping a font file with the image.
 */
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
      const document = new PDFDocument({ size: 'A4', margin: 56 })
      const stream = createWriteStream(path)

      // The promise settles on the FILE, not on the document: `document.end()`
      // only finishes writing to the stream, and returning before the stream
      // closed would hand back a path to a half-written PDF.
      stream.on('finish', () => resolve())
      stream.on('error', reject)
      document.on('error', reject)
      document.pipe(stream)

      document.fillColor('#111827').font('Helvetica-Bold').fontSize(20).text(input.headline)
      document.moveDown(0.3)
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#6b7280')
        .text(`${input.recordingTitle} · ${formatDate(input.createdAt)}`)

      document.moveDown(1.2)
      document.font('Helvetica').fontSize(11.5).fillColor('#1f2937').text(input.overview, {
        align: 'justify',
        lineGap: 3,
      })

      this.list(document, 'Pontos principais', input.topics)
      this.list(document, 'Próximos passos', input.actionItems)

      document
        .moveDown(2)
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#9ca3af')
        .text('Gerado automaticamente pelo Audio Mind a partir da transcrição do áudio.')

      document.end()
    })
  }

  // An empty section is omitted entirely: a heading over nothing reads like the
  // document failed, and "no action items" is a legitimate outcome.
  private list(document: PDFKit.PDFDocument, heading: string, items: string[]): void {
    if (!items.length) return

    document.moveDown(1.2)
    document.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text(heading)
    document.moveDown(0.4)
    document.font('Helvetica').fontSize(11.5).fillColor('#1f2937')

    for (const item of items) {
      document.text(`•  ${item}`, { indent: 6, lineGap: 2 })
      document.moveDown(0.25)
    }
  }
}

function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}
