import { UseCase } from 'shared'
import { ShareLink, expirationFor } from '../model'
import { ShareLinkRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the body. */
  ownerId: string
  /** The app layer reads the recording FIRST, which is what answers
   * RECORDING_NOT_FOUND for someone else's audio: this context knows nothing
   * about who owns a recording. */
  recordingId: string
  /** '24h' | '7d' | '30d'. Anything else reads as the shortest. */
  window?: string
  includesTranscript?: boolean
  includesAudio?: boolean
}

/**
 * Hands out a new link. A COMMAND, so it answers nothing (CQRS) — the screen
 * re-reads the list, where the new link is the first row with its copy button.
 *
 * Every call creates a NEW token, deliberately: two people who were sent
 * different links can be cut off separately, which is the whole reason revoking
 * is per link and not per recording.
 */
export default class CreateShareLink implements UseCase<Input, void> {
  constructor(private readonly repository: ShareLinkRepository) {}

  async execute(input: Input): Promise<void> {
    const link = new ShareLink({
      ownerId: input.ownerId,
      recordingId: input.recordingId,
      includesTranscript: input.includesTranscript,
      includesAudio: input.includesAudio,
      expiresAt: expirationFor(input.window),
    })

    await this.repository.create(link)
  }
}
