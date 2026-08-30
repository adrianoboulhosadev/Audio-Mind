/** READ projection (CQRS) of one task — plain values built straight from the
 * query. `recordingId` is here so the screen can link back to where it was
 * said; the recording's TITLE is not, because this context does not know it
 * (the app layer joins the two, same as it does for the search). */
export interface TaskDTO {
  id: string
  recordingId: string
  text: string
  doneAt: Date | null
  createdAt: Date
}

/** What the tasks screen shows in one answer: the slice asked for, plus how
 * many are still open in the WHOLE list — the same shape the inbox uses, and
 * for the same reason (a badge must not depend on the page size). */
export interface TaskFeedDTO {
  pendingCount: number
  items: TaskDTO[]
}
