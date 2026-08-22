import { join, normalize, resolve, sep } from 'path'
import { ValidationError, Errors } from 'shared'

/**
 * Local (no cloud) file storage. Everything the user uploads and everything the
 * pipeline generates lives under ONE root, which docker-compose mounts as a
 * named volume — recreating the container must not erase people's audio.
 *
 * The worker writes the generated PDFs into this same root, which is why the
 * path is an env var rather than a constant: the two processes see it at
 * different absolute paths.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads')

export const AUDIO_SUBDIR = 'audios'
export const SUMMARY_SUBDIR = 'summaries'
/** Created at boot by main.ts — multer does not create its destination. */
export const UPLOADS_SUBDIRS = [AUDIO_SUBDIR, SUMMARY_SUBDIR]

export const AUDIO_UPLOAD_DIR = join(UPLOADS_DIR, AUDIO_SUBDIR)

/** The public prefix stored in the database (`/uploads/audios/<uuid>.webm`). */
export const UPLOADS_URL_PREFIX = '/uploads/'

/**
 * Turns a stored path into an absolute one, REFUSING anything that would escape
 * the uploads root.
 *
 * This matters because the path reaches us in a request BODY: the client
 * uploads the file, gets a path back and then posts it when creating the
 * recording. Without this check a crafted `/uploads/../../etc/passwd` would be
 * read (and served) by the download routes. Belongs to the app layer, not to
 * the domain — the domain knows the audio has a path, not where the disk is.
 */
export function resolveUploadPath(url: string): string {
  if (!url?.startsWith(UPLOADS_URL_PREFIX)) {
    ValidationError.throwError(Errors.AUDIO_FILE_REQUIRED, undefined)
  }

  const relative = normalize(url.slice(UPLOADS_URL_PREFIX.length))
  const absolute = resolve(UPLOADS_DIR, relative)

  if (absolute !== UPLOADS_DIR && !absolute.startsWith(UPLOADS_DIR + sep)) {
    ValidationError.throwError(Errors.AUDIO_FILE_REQUIRED, undefined)
  }

  return absolute
}

/**
 * The mime type a browser sends carries parameters ("audio/webm;codecs=opus"),
 * and MediaRecorder always does. Everything downstream — the supported-format
 * list, the Content-Type of the download — compares bare types, so the
 * parameters are stripped once, here.
 */
export function normalizeMimeType(mimeType: string): string {
  return mimeType?.split(';')[0].trim().toLowerCase() ?? ''
}
