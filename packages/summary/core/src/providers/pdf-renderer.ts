export interface PdfRendererInput {
  recordingId: string
  recordingTitle: string
  headline: string
  overview: string
  topics: string[]
  actionItems: string[]
  createdAt: Date
}

/**
 * Renders the summary as a PDF and returns the path it was written to.
 *
 * A PORT, not a helper, for the usual reason: the domain hands over CONTENT and
 * gets back a location; which library draws it and where the file lands are the
 * adapter's business (apps/worker writes into the same uploads volume the API
 * serves).
 */
export interface PdfRenderer {
  render(input: PdfRendererInput): Promise<string>
}
