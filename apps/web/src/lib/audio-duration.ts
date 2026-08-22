/**
 * How long an audio file is, measured in the BROWSER.
 *
 * The server would have to decode the file to learn this, which means shipping
 * ffmpeg just to fill one column — while the browser already knows, because it
 * is about to play it.
 *
 * The `Infinity` dance is not paranoia: a WebM produced by MediaRecorder (and
 * plenty of streamed files) carries no duration in its header, and browsers
 * report `Infinity` until the media is seeked to the end. Seeking to a
 * deliberately huge time forces the browser to walk the file and settle on the
 * real value.
 */
export function readAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const element = document.createElement('audio')
    const objectUrl = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      element.remove()
    }

    element.preload = 'metadata'
    element.src = objectUrl

    element.onerror = () => {
      cleanup()
      reject(new Error('Não consegui ler esse arquivo de áudio.'))
    }

    element.onloadedmetadata = () => {
      if (element.duration !== Infinity && !Number.isNaN(element.duration)) {
        const duration = element.duration
        cleanup()
        resolve(duration)
        return
      }

      element.ontimeupdate = () => {
        element.ontimeupdate = null
        const duration = element.duration
        cleanup()
        if (!Number.isFinite(duration)) {
          reject(new Error('Não consegui ler a duração desse áudio.'))
          return
        }
        resolve(duration)
      }
      // Any absurdly large time works: the browser clamps to the real end.
      element.currentTime = 24 * 60 * 60
    }
  })
}
