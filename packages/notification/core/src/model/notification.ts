import { Entity, EntityProps, ValidationError, Errors } from 'shared'
import { NotificationInput, NotificationType, NOTIFICATION_TYPES } from './notification-input'

export interface NotificationProps extends EntityProps {
  userId?: string
  type?: NotificationType
  title?: string
  body?: string
  /** Where clicking it takes the user (a front route). Null = nowhere to go. */
  link?: string | null
  referenceId?: string | null
  readAt?: Date | null
  createdAt?: Date
}

/**
 * One line in a user's inbox (rich entity).
 *
 * The COPY lives here, not in the callers: two different apps raise
 * notifications (the backend on sign-up, the worker when the pipeline ends), and
 * `Notification.for` is what keeps "what we tell the user" a single decision of
 * the domain instead of strings scattered across controllers. The text is stored
 * already rendered — a notification is a record of what was said at the time, so
 * a later wording change never rewrites history.
 */
export class Notification extends Entity<Notification, NotificationProps> {
  readonly userId: string
  readonly type: NotificationType
  readonly title: string
  readonly body: string
  readonly link: string | null
  readonly referenceId: string | null
  readonly createdAt: Date
  readAt: Date | null

  constructor(props: NotificationProps) {
    super(props)
    const userId = props.userId?.trim() ?? ''
    if (!userId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'userId')

    const title = props.title?.trim() ?? ''
    if (!title) ValidationError.throwError(Errors.REQUIRED_FIELD, 'title')

    const body = props.body?.trim() ?? ''
    if (!body) ValidationError.throwError(Errors.REQUIRED_FIELD, 'body')

    if (!props.type || !NOTIFICATION_TYPES.includes(props.type)) {
      ValidationError.throwError(Errors.REQUIRED_FIELD, 'type')
    }

    this.userId = userId
    this.type = props.type
    this.title = title
    this.body = body
    this.link = props.link ?? null
    this.referenceId = props.referenceId ?? null
    this.readAt = props.readAt ?? null
    this.createdAt = props.createdAt ?? new Date()
  }

  get isRead(): boolean {
    return this.readAt !== null
  }

  /** Idempotent: re-reading an already-read notification keeps the original
   * timestamp (marking all as read must not rewrite the whole inbox). */
  markAsRead(): void {
    if (this.readAt) return
    this.readAt = new Date()
  }

  /** Builds the finished notification for an event. The switch is exhaustive
   * over NotificationInput, so adding a type without its copy fails the build. */
  static for(input: NotificationInput): Notification {
    const { title, body, link } = Notification.render(input)
    return new Notification({
      userId: input.userId,
      type: input.type,
      referenceId: input.referenceId,
      title,
      body,
      link,
    })
  }

  private static render(input: NotificationInput): {
    title: string
    body: string
    link: string | null
  } {
    switch (input.type) {
      case 'recording_ready':
        return {
          title: 'Resumo pronto',
          body: `"${input.title}" foi transcrito e resumido. O PDF já está disponível.`,
          link: `/recordings/${input.recordingId}`,
        }
      // The reason is part of the copy on purpose: a bare "deu erro" only makes
      // the user upload the same audio again and hit the same wall.
      case 'recording_failed':
        return {
          title: 'Não consegui processar',
          body: `"${input.title}" não foi processado. ${input.reason}`,
          link: `/recordings/${input.recordingId}`,
        }
      case 'welcome':
        return {
          title: 'Bem-vindo ao Audio Mind',
          body: 'Grave ou envie um áudio e receba a transcrição, o resumo e o PDF.',
          link: '/recordings',
        }
    }
  }
}
