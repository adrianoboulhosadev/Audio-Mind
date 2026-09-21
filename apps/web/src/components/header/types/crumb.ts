/** One step of the trail in the header. */
export interface Crumb {
  label: string
  /** Absent on the LAST step — it is where the reader already is, and a link to
   * the page you are on is a link nobody has a reason to follow. */
  href?: string
}
