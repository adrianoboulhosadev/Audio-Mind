import { RecordingRepository, SuggestRecordingTitle } from '@recording/core'

export default class SuggestRecordingTitleController {
  constructor(private readonly repository: RecordingRepository) {}

  async execute(recordingId: string, title: string): Promise<void> {
    await new SuggestRecordingTitle(this.repository).execute({ recordingId, title })
  }
}
