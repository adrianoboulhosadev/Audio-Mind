/** Marking a moment. The recording is NOT in the body — it is in the path, and
 * the app layer reads it (and its owner) before this context sees anything. */
export interface AddAnnotationInput {
  atSeconds: number
  /** Absent for a plain mark, which is the fastest thing to make while
   * listening. */
  note?: string | null
}

export interface EditAnnotationNoteInput {
  note?: string | null
}
