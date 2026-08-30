/**
 * What the owner chooses when handing out a link. The recording is NOT in the
 * body — it is in the path, and the app layer reads it (and its owner) before
 * this context ever sees it.
 */
export interface CreateShareLinkInput {
  /** '24h' | '7d' | '30d'. Fail-closed: anything else is the shortest. */
  window?: string
  includesTranscript?: boolean
  includesAudio?: boolean
}
