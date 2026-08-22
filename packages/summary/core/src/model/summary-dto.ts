/** READ projection (CQRS) of a summary — plain strings, built straight from the
 * query. `pdfUrl` null means the PDF has not been rendered (yet). */
export interface SummaryDTO {
  id: string
  recordingId: string
  headline: string
  overview: string
  topics: string[]
  actionItems: string[]
  model: string
  pdfUrl: string | null
  createdAt: Date
}
