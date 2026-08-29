import { PrismaClient } from 'database'
import { Summary, SummaryDTO, SummaryQueryRepository, SummaryRepository } from '@summary/adapters'

export class PrismaSummaryRepository implements SummaryRepository, SummaryQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** UPSERT keyed by recordingId: a retried recording REPLACES its summary. */
  async save(summary: Summary): Promise<void> {
    const data = {
      headline: summary.headline.value,
      overview: summary.overview.value,
      topics: summary.topics.map((topic) => topic.value),
      actionItems: summary.actionItems.map((item) => item.value),
      model: summary.model,
      pdfUrl: summary.pdfUrl,
    }
    await this.prisma.summary.upsert({
      where: { recordingId: summary.recordingId },
      create: { id: summary.id.value, recordingId: summary.recordingId, ...data },
      update: data,
    })
  }

  async findByRecording(recordingId: string): Promise<Summary | null> {
    const row = await this.prisma.summary.findUnique({ where: { recordingId } })
    return row ? new Summary({ ...row }) : null
  }

  async update(summary: Summary): Promise<void> {
    await this.prisma.summary.update({
      where: { id: summary.id.value },
      data: { pdfUrl: summary.pdfUrl },
    })
  }

  /**
   * The subset of `recordingIds` whose summary mentions the term — headline,
   * overview or one of the bullets. ILIKE and not full-text, same reasoning as
   * the transcript search: the id list already bounds the scan to one person's
   * library.
   */
  async searchRecordingIdsQuery(
    term: string,
    recordingIds: string[],
    limit: number,
  ): Promise<string[]> {
    const rows = await this.prisma.summary.findMany({
      where: {
        recordingId: { in: recordingIds },
        OR: [
          { headline: { contains: term, mode: 'insensitive' } },
          { overview: { contains: term, mode: 'insensitive' } },
          { topics: { has: term } },
          { actionItems: { has: term } },
        ],
      },
      select: { recordingId: true },
      take: limit,
    })
    return rows.map((row) => row.recordingId)
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    await this.prisma.summary.deleteMany({ where: { recordingId } })
  }

  async findByRecordingQuery(recordingId: string): Promise<SummaryDTO | null> {
    return this.prisma.summary.findUnique({ where: { recordingId } })
  }
}
