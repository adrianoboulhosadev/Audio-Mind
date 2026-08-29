import { writeFileSync } from 'fs'

/** Where the worker says "I am still here". /tmp because it is writable by the
 * unprivileged user the container runs as, and because it is worthless after a
 * restart — which is exactly what it should be. */
export const HEARTBEAT_PATH = process.env.WORKER_HEARTBEAT_PATH ?? '/tmp/worker-heartbeat'

/** Comfortably more often than the healthcheck's tolerance, so one missed tick
 * (a busy event loop) never reads as a dead worker. */
const EVERY_MS = 15_000

/**
 * Keeps a file's timestamp fresh while the process is alive.
 *
 * A queue consumer has no port to answer on, so this is what docker can look at.
 * It proves the process exists AND that its event loop is still turning — which
 * is the failure a `restart: unless-stopped` cannot see on its own: a container
 * that is up while nothing inside it moves.
 */
export function startHeartbeat(): void {
  const beat = () => {
    try {
      writeFileSync(HEARTBEAT_PATH, String(Date.now()))
    } catch (error) {
      // A worker that cannot write to /tmp still processes audio; losing the
      // healthcheck is not a reason to take it down.
      console.warn('[worker] could not write the heartbeat file:', error)
    }
  }

  beat()
  // Unreferenced: the timer must never be the reason the process stays alive
  // after the queue consumer is gone.
  setInterval(beat, EVERY_MS).unref()
}
