/**
 * How much of a recording a link hands over.
 *
 * The SUMMARY is always in — that is what a share link is for, and a link that
 * showed nothing would be a link to an empty page. Everything else is opt-in,
 * one explicit choice at a time, because the transcript is every word somebody
 * said and the audio is their voice: those are not the same thing as "the
 * summary I wrote about the meeting", and defaulting them on would hand them
 * over by accident.
 */
export interface ShareScopeProps {
  transcript?: boolean
  audio?: boolean
}

export class ShareScope {
  readonly transcript: boolean
  readonly audio: boolean

  constructor(props?: ShareScopeProps) {
    this.transcript = props?.transcript === true
    this.audio = props?.audio === true
  }

  /** The default, and what an absent choice always means. */
  static summaryOnly(): ShareScope {
    return new ShareScope()
  }
}
