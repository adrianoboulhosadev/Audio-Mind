import {
  SpeechToTextProvider,
  TranscriptionDTO,
  TranscriptionQueryRepository,
  TranscriptionRepository,
  TranscriptMatchDTO,
} from '@transcription/core'
import {
  DeleteTranscriptionController,
  GetTranscriptionController,
  SearchTranscriptsController,
  TranscribeRecordingController,
} from '../controllers'

/**
 * Single entry point the apps call: the worker writes (transcribe), the backend
 * reads and deletes. Optional ports in the constructor — the backend never wires
 * a speech-to-text provider, because transcribing is not something an HTTP
 * request does.
 */
export default class TranscriptionFacade {
  constructor(
    private readonly repository?: TranscriptionRepository,
    private readonly queryRepository?: TranscriptionQueryRepository,
    private readonly speechToText?: SpeechToTextProvider,
  ) {}

  async transcribeRecording(input: {
    recordingId: string
    audioPath: string
    mimeType: string
    language?: string
  }): Promise<void> {
    await new TranscribeRecordingController(this.repository!, this.speechToText!).execute(input)
  }

  async getTranscription(recordingId: string): Promise<TranscriptionDTO> {
    return new GetTranscriptionController(this.queryRepository!).execute(recordingId)
  }

  /** Which of THESE recordings have a transcript mentioning the term, and where
   * in each. Ids in, matches out — this context never learns who owns them. */
  async searchTranscripts(
    term: string,
    recordingIds: string[],
    limit?: number,
  ): Promise<TranscriptMatchDTO[]> {
    return new SearchTranscriptsController(this.queryRepository!).execute(term, recordingIds, limit)
  }

  async deleteTranscription(recordingId: string): Promise<void> {
    await new DeleteTranscriptionController(this.repository!).execute(recordingId)
  }
}
