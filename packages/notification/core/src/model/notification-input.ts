export const NOTIFICATION_TYPES = [
  // the pipeline finished — the summary and the PDF are there
  'recording_ready',
  // the pipeline gave up, and the line says WHY
  'recording_failed',
  // the account was created
  'welcome',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

interface Recipient {
  /** Who receives it. A logical FK to users — notification owns no identity. */
  userId: string
  /** The thing that caused it (a recording id). Together with (userId, type) it
   * is what makes delivery IDEMPOTENT — see the repository. */
  referenceId?: string | null
}

/**
 * Everything needed to WRITE a notification, one shape per type (discriminated
 * union): each event carries only the facts its copy actually uses, so a caller
 * cannot forget the reason of a failure or invent a field. `Notification.for`
 * turns one of these into the finished entity.
 */
export type NotificationInput =
  | (Recipient & { type: 'recording_ready'; recordingId: string; title: string })
  | (Recipient & { type: 'recording_failed'; recordingId: string; title: string; reason: string })
  | (Recipient & { type: 'welcome' })
