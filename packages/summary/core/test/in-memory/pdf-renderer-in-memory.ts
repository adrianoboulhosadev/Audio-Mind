import { PdfRenderer, PdfRendererInput } from '../../src'

/** Fake of the PDF port: hands back a path and keeps what it was asked to draw,
 * so a test can assert the CONTENT crossed the port (not the entity). */
export default class PdfRendererInMemory implements PdfRenderer {
  readonly calls: PdfRendererInput[] = []

  constructor(private readonly failure?: Error) {}

  async render(input: PdfRendererInput): Promise<string> {
    this.calls.push(input)
    if (this.failure) throw this.failure
    return `/uploads/summaries/${input.recordingId}.pdf`
  }
}
