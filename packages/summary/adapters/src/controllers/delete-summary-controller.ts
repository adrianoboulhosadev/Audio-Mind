import { DeleteSummary, SummaryRepository } from '@summary/core'

export default class DeleteSummaryController {
  constructor(private readonly repository: SummaryRepository) {}

  async execute(recordingId: string): Promise<void> {
    await new DeleteSummary(this.repository).execute(recordingId)
  }
}
