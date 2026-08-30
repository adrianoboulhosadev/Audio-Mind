/** Totals of the whole user base — the admin overview's first line. Counted in
 * the database rather than derived from a listing, so it stays true no matter
 * how many rows the listing was capped at. */
export interface UserStatsDTO {
  total: number
  active: number
  admins: number
}
