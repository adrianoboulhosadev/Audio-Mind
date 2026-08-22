import { Entity, EntityProps, ValidationError, Errors, Validator } from 'shared'
import { SummaryBullet, SummaryHeadline, SummaryOverview } from './summary-text'

export interface SummaryProps extends EntityProps {
  /** Logical FK to the recording — a different context; summary never imports
   * it. One summary per recording (the column is unique). */
  recordingId?: string
  headline?: string
  overview?: string
  topics?: string[]
  actionItems?: string[]
  /** Which model wrote it. Stored because the text is a RECORD of what that
   * model said at that time. */
  model?: string
  /** Path of the rendered PDF, or null until it is rendered — a second step of
   * the same pipeline (see RenderSummaryPdf). */
  pdfUrl?: string | null
  createdAt?: Date
}

/**
 * What the LLM wrote about a transcript (rich entity).
 *
 * The CONTENT is frozen at creation: the summary is a record of what the model
 * produced for that audio, so there is no `edit` — regenerating means running
 * the pipeline again, which replaces the row. The one thing that changes
 * afterwards is the PDF, which is rendered from this same content.
 */
export class Summary extends Entity<Summary, SummaryProps> {
  /** A summary is a summary. Past this many bullets the model is transcribing,
   * not summarizing — and a 60-item list helps nobody. */
  static readonly MAX_ITEMS = 12
  static readonly MAX_PDF_URL_LENGTH = 500

  readonly recordingId: string
  readonly headline: SummaryHeadline
  readonly overview: SummaryOverview
  readonly topics: SummaryBullet[]
  readonly actionItems: SummaryBullet[]
  readonly model: string
  readonly createdAt: Date
  pdfUrl: string | null

  constructor(props: SummaryProps) {
    super(props)
    const recordingId = props.recordingId?.trim() ?? ''
    if (!recordingId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'recordingId')

    const model = props.model?.trim() ?? ''
    if (!model) ValidationError.throwError(Errors.REQUIRED_FIELD, 'model')

    this.recordingId = recordingId
    this.headline = new SummaryHeadline(props.headline)
    this.overview = new SummaryOverview(props.overview)
    this.topics = Summary.buildBullets(props.topics ?? [])
    this.actionItems = Summary.buildBullets(props.actionItems ?? [])
    this.model = model
    this.pdfUrl = props.pdfUrl ?? null
    this.createdAt = props.createdAt ?? new Date()
  }

  get hasPdf(): boolean {
    return this.pdfUrl !== null
  }

  /**
   * Attaches the rendered PDF. Re-rendering overwrites the path on purpose: the
   * PDF is derived from this content, so a second render produces the same
   * document — keeping the older path would only leave a file nobody points at.
   */
  attachPdf(url: string): void {
    const trimmed = url?.trim() ?? ''
    if (!trimmed) ValidationError.throwError(Errors.REQUIRED_FIELD, 'pdfUrl')

    const tooLong = Validator.maxLength(
      trimmed,
      Summary.MAX_PDF_URL_LENGTH,
      Errors.SUMMARY_TEXT_TOO_LONG,
    )
    if (tooLong) throw tooLong

    this.pdfUrl = trimmed
  }

  // Empty bullets are DROPPED rather than rejected: a model that ends its list
  // with a blank line produced a usable summary, and failing the whole audio
  // over trailing whitespace would be absurd. A genuine wall of bullets is a
  // different thing, and that one is refused.
  private static buildBullets(values: string[]): SummaryBullet[] {
    const filled = values.filter((value) => value?.trim())
    if (filled.length > Summary.MAX_ITEMS) {
      ValidationError.throwError(Errors.TOO_MANY_SUMMARY_ITEMS, undefined, {
        max: Summary.MAX_ITEMS,
        length: filled.length,
      })
    }
    return filled.map((value) => new SummaryBullet(value))
  }
}
