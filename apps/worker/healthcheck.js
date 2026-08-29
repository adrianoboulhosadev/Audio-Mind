// Docker's HEALTHCHECK for the worker. It has no port to answer on, so what is
// checked is the heartbeat file the process keeps touching (src/heartbeat.ts):
// recent enough means the process is alive AND its event loop is turning.
const { statSync } = require('fs')

const path = process.env.WORKER_HEARTBEAT_PATH ?? '/tmp/worker-heartbeat'
// Four missed beats. Generous on purpose: a worker in the middle of a long
// transcription is busy, not dead.
const MAX_AGE_MS = 60_000

try {
  process.exit(Date.now() - statSync(path).mtimeMs < MAX_AGE_MS ? 0 : 1)
} catch {
  process.exit(1)
}
