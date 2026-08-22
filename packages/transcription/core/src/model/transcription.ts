import { Entity, EntityProps, ValidationError, Errors } from 'shared'
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
  createdAt?: Date
}

/** The transcript of one recording (rich entity). */
export class Transcription extends Entity<Transcription, TranscriptionProps> {
  readonly recordingId: string
  readonly text: TranscriptText
  readonly language: string | null
  readonly model: string
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
    this.createdAt = props.createdAt ?? new Date()
  }
}
