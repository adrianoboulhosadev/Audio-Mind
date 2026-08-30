import { Request, Response } from 'express'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'

/**
 * Writes an audio file onto the response, honouring Range.
 *
 * Extracted because TWO routes serve the same bytes under different
 * authorizations — the owner's stream (capability token) and a share link that
 * includes the audio. The authorization is what differs; how the bytes travel is
 * not, and a second copy of range parsing is a second place to get a 206 wrong.
 */
export async function streamAudioFile(
  request: Request,
  response: Response,
  file: { path: string; mimeType: string },
): Promise<void> {
  const { size } = await stat(file.path)

  response.setHeader('Content-Type', file.mimeType)
  // Without this the browser never even TRIES a range request.
  response.setHeader('Accept-Ranges', 'bytes')
  // The bytes are private: no shared cache may keep a copy.
  response.setHeader('Cache-Control', 'private, max-age=0, no-store')

  const range = parseRange(request.headers.range, size)

  if (range === 'invalid') {
    response.status(416).setHeader('Content-Range', `bytes */${size}`)
    response.end()
    return
  }

  if (!range) {
    response.setHeader('Content-Length', size)
    createReadStream(file.path).pipe(response)
    return
  }

  response.status(206)
  response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
  response.setHeader('Content-Length', range.end - range.start + 1)
  createReadStream(file.path, { start: range.start, end: range.end }).pipe(response)
}

/**
 * `bytes=start-end`, the only form browsers send for media. A missing end means
 * "to the last byte"; a missing start (`bytes=-500`) means the last N bytes,
 * which is what a player asks for when it goes looking for a container's index
 * at the end of the file.
 */
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | 'invalid' {
  if (!header) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return 'invalid'

  const [, rawStart, rawEnd] = match
  if (!rawStart && !rawEnd) return 'invalid'

  const start = rawStart ? Number(rawStart) : Math.max(size - Number(rawEnd), 0)
  const end = rawStart ? Math.min(rawEnd ? Number(rawEnd) : size - 1, size - 1) : size - 1

  if (start > end || start >= size) return 'invalid'
  return { start, end }
}
