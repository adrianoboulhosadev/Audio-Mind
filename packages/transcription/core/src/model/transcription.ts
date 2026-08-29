import { Entity, EntityProps, ValidationError, Errors } from 'shared'
import { TranscriptSegment, TranscriptSegmentInput } from './transcript-segment'
import { TranscriptText } from './transcript-text'

export interface TranscriptionProps extends EntityProps {
  /** Logical FK to the recording — a different context; transcription never
   * imports it. One transcript per recording (the column is unique), which is
   * what makes re-processing idempotent instead of piling up rows. */
  recordingId?: string
  text?: string
  /** What the model detected, when it says so (e.g. "pt"). Null is fine — it is
   * metadata, not a rule. */
  language?: string | null
  /** Which model produced it. Stored because the text is a RECORD of what that
   * model heard at that time; swapping models later does not rewrite history. */
  model?: string
  /** When the model says WHEN each stretch was said. Optional: an older row has
   * none, and a transcript without them is still a transcript. */
  segments?: TranscriptSegmentInput[] | null
  createdAt?: Date
}

/** The transcript of one recording (rich entity). */
export class Transcription extends Entity<Transcription, TranscriptionProps> {
  /** Far past what an hour of speech produces; a longer list is a malfunction,
   * and the tail of it would never be read anyway. */
  static readonly MAX_SEGMENTS = 20_000

  readonly recordingId: string
  readonly text: TranscriptText
  readonly language: string | null
  readonly model: string
  readonly segments: TranscriptSegment[]
  readonly createdAt: Date

  constructor(props: TranscriptionProps) {
    super(props)
    const recordingId = props.recordingId?.trim() ?? ''
    if (!recordingId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'recordingId')

    const model = props.model?.trim() ?? ''
    if (!model) ValidationError.throwError(Errors.REQUIRED_FIELD, 'model')

    this.recordingId = recordingId
    this.text = new TranscriptText(props.text)
    this.language = props.language?.trim() || null
    this.model = model
    // A bad segment is DROPPED, not fatal — same reasoning as an empty bullet in
    // a summary: refusing an audio that was transcribed fine because one entry
    // of its index came back crooked would be absurd.
    this.segments = (props.segments ?? [])
      .slice(0, Transcription.MAX_SEGMENTS)
      .map((segment) => TranscriptSegment.parse(segment))
      .filter((segment): segment is TranscriptSegment => segment !== null)
    this.createdAt = props.createdAt ?? new Date()
  }
}
