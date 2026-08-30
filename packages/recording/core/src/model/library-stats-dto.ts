import { RecordingStatus } from './recording'

/**
 * Totals of EVERY recording in the installation — the admin overview.
 *
 * Counted in the database rather than derived from a listing, so it stays true
 * however the listing was capped. `storageBytes` is what the audio files add up
 * to according to the rows; what is actually ON DISK is measured by the app
 * layer (which owns the uploads folder), and the two together are what tell an
 * administrator whether something was left behind.
 */
export interface LibraryStatsDTO {
  byStatus: Record<RecordingStatus, number>
  total: number
  storageBytes: number
}

/** How much of the library belongs to one owner. Answered for a LIST of owners
 * at once, because the admin screen shows a page of users and one query beats
 * one query per row. */
export interface OwnerUsageDTO {
  ownerId: string
  recordings: number
  storageBytes: number
}
