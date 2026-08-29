import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingRepository } from '../providers'

interface Input {
  recordingId: string
  /** The summary's headline — what the model called the audio. */
  title: string
}

/**
 * The SYSTEM naming an audio nobody named: the worker offers the headline the
 * summary produced, and the entity decides whether to take it (it only does
 * while the title is still the placeholder).
 *
 * No ownerId, for the same reason GetRecordingForProcessingQuery has none:
 * there is no authenticated caller behind a queue job. It is a separate use
 * case rather than an option on `RenameRecording` precisely so nothing on an
 * HTTP route can reach a rename with no owner check.
 */
export default class SuggestRecordingTitle implements UseCase<Input, void> {
  constructor(private readonly repository: RecordingRepository) {}

  async execute({ recordingId, title }: Input): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording) NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)

    recording.adoptSuggestedTitle(title)
    await this.repository.update(recording)
  }
}
