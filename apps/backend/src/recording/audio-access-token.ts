import * as jwt from 'jsonwebtoken'

/** How long a link stays good. Long enough for any listening session, short
 * enough that a URL that leaked out of a browser history stops working. */
const TTL = '2h'

/** What the token is FOR. A capability token that could be replayed as an
 * access token would be a hole, so the purpose is checked on the way in. */
const PURPOSE = 'recording-audio'

export interface AudioAccessClaims {
  purpose: string
  userId: string
  recordingId: string
}

/**
 * A short-lived capability to read ONE recording's audio.
 *
 * The `<audio>` element cannot send an Authorization header, and the uploads
 * folder is deliberately not public — so playing by URL needs a credential IN
 * the URL. This is not the access token: it is scoped to a single recording,
 * cannot be used against any other route (the purpose claim), and expires on
 * its own. Handing out the 15-minute access token instead would have been a
 * bigger key for a smaller lock, and it would also break mid-playback when the
 * session rotates it.
 */
export function signAudioAccess(userId: string, recordingId: string): string {
  const claims: AudioAccessClaims = { purpose: PURPOSE, userId, recordingId }
  return jwt.sign(claims, process.env.JWT_SECRET!, { expiresIn: TTL })
}

/** The claims, or null for anything that is not a valid audio capability. */
export function verifyAudioAccess(token: string): AudioAccessClaims | null {
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET!) as AudioAccessClaims
    return claims.purpose === PURPOSE && claims.userId && claims.recordingId ? claims : null
  } catch {
    return null
  }
}
