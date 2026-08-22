import {
  TranscribeRecording,
  TranscriptionRepository,
  SpeechToTextProvider,
} from '@transcription/core'

export default class TranscribeRecordingController {
  constructor(
    private readonly repository: TranscriptionRepository,
    private readonly speechToText: SpeechToTextProvider,
  ) {}

  async execute(input: {
    recordingId: string
    audioPath: string
    mimeType: string
    language?: string
  }): Promise<void> {
    await new TranscribeRecording(this.repository, this.speechToText).execute(input)
  }
}
