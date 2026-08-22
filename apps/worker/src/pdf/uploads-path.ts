import { join, normalize, resolve, sep } from 'path'

/**
 * Where the uploads volume is mounted FROM THE WORKER'S POINT OF VIEW. The
 * backend and the worker see the same folder at different absolute paths (two
 * containers, one volume), which is why this is an env var and not a constant.
 *
 * The default assumes host development, where the worker runs with its own app
 * folder as cwd and the backend's uploads sit next door.
 */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? resolve(process.cwd(), '..', 'backend', 'uploads')

export const SUMMARY_SUBDIR = 'summaries'
export const SUMMARY_DIR = join(UPLOADS_DIR, SUMMARY_SUBDIR)

/** The public prefix stored in the database — must match the backend's. */
export const UPLOADS_URL_PREFIX = '/uploads/'

/**
 * Turns a stored path into an absolute one, refusing anything that escapes the
 * uploads root — the same check the backend does, for the same reason: the path
 * originally reached the system in a request body.
 */
export function resolveUploadPath(url: string): string {
  if (!url?.startsWith(UPLOADS_URL_PREFIX)) {
    throw new Error(`Refusing a path outside the uploads root: ${url}`)
  }

  const absolute = resolve(UPLOADS_DIR, normalize(url.slice(UPLOADS_URL_PREFIX.length)))
  if (absolute !== UPLOADS_DIR && !absolute.startsWith(UPLOADS_DIR + sep)) {
    throw new Error('Refusing a path outside the uploads root.')
  }

  return absolute
}
