import { Summary, SummaryDTO, SummaryQueryRepository, SummaryRepository } from '../../src'

interface SummaryRow {
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

/** Fake of the summaries table. `save` upserts by recordingId, like the Prisma
 * adapter — that unique key is what keeps a retry from duplicating. */
export default class SummaryRepositoryInMemory implements SummaryRepository, SummaryQueryRepository {
  private rows: SummaryRow[] = []

  private serialize(summary: Summary): SummaryRow {
    return {
      id: summary.id.value,
      recordingId: summary.recordingId,
      headline: summary.headline.value,
      overview: summary.overview.value,
      topics: summary.topics.map((topic) => topic.value),
      actionItems: summary.actionItems.map((item) => item.value),
      model: summary.model,
      pdfUrl: summary.pdfUrl,
      createdAt: summary.createdAt,
    }
  }

  async save(summary: Summary): Promise<void> {
    const row = this.serialize(summary)
    const index = this.rows.findIndex((current) => current.recordingId === row.recordingId)
    if (index >= 0) this.rows[index] = row
    else this.rows.push(row)
  }

  async findByRecording(recordingId: string): Promise<Summary | null> {
    const row = this.rows.find((current) => current.recordingId === recordingId)
    return row ? new Summary({ ...row }) : null
  }

  async update(summary: Summary): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === summary.id.value)
    if (index >= 0) this.rows[index] = this.serialize(summary)
  }

  // Same fields the SQL looks at: headline, overview and the bullets.
  async searchRecordingIdsQuery(
    term: string,
    recordingIds: string[],
    limit: number,
  ): Promise<string[]> {
    const lowered = term.toLowerCase()
    const mentions = (row: SummaryRow) =>
      [row.headline, row.overview, ...row.topics, ...row.actionItems].some((text) =>
        text.toLowerCase().includes(lowered),
      )

    return this.rows
      .filter((row) => recordingIds.includes(row.recordingId) && mentions(row))
      .slice(0, limit)
      .map((row) => row.recordingId)
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    this.rows = this.rows.filter((current) => current.recordingId !== recordingId)
  }

  async findByRecordingQuery(recordingId: string): Promise<SummaryDTO | null> {
    const row = this.rows.find((current) => current.recordingId === recordingId)
    return row ? { ...row } : null
  }

  get size(): number {
    return this.rows.length
  }
}
