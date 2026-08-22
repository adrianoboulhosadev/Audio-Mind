import { UseCase } from 'shared'
import { Transcription } from '../model'
import { SpeechToTextProvider, TranscriptionRepository } from '../providers'

interface Input {
  recordingId: string
  /** ABSOLUTE path on disk + format, resolved by the app layer (worker) — this
   * context never learns where the uploads root is. */
  audioPath: string
  mimeType: string
  language?: string
}

/**
 * Runs the audio through the speech-to-text port and stores what came back.
 *
 * The use case only orchestrates: call the port, build the entity, persist. The
 * rule that an empty answer is NOT a transcript belongs to the TranscriptText
 * value object — so a silent audio throws EMPTY_TRANSCRIPT here and the worker
 * turns it into a failed recording, instead of quietly summarizing nothing.
 *
 * Persisting is an upsert by recordingId (see the port), which is what makes a
 * retried job replace the previous transcript rather than duplicate it.
 */
export default class TranscribeRecording implements UseCase<Input, void> {
  constructor(
    private readonly repository: TranscriptionRepository,
    private readonly speechToText: SpeechToTextProvider,
  ) {}

  async execute({ recordingId, audioPath, mimeType, language }: Input): Promise<void> {
    const result = await this.speechToText.transcribe({ audioPath, mimeType, language })

    const transcription = new Transcription({
      recordingId,
      text: result.text,
      language: result.language,
      model: result.model,
    })

    await this.repository.save(transcription)
  }
}
