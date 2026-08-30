/** READ projection (CQRS) of one mark. `recordingId` is here so the library-wide
 * screen can link back; the recording's TITLE is not, because this context does
 * not know it — the app layer joins the two, same as it does for the tasks. */
export interface AnnotationDTO {
  id: string
  recordingId: string
  atSeconds: number
  note: string | null
  createdAt: Date
  updatedAt: Date
}
