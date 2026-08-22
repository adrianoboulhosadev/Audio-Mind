import { Agent as HttpsAgent } from 'node:https'
import OpenAI, { APIConnectionError, InternalServerError, RateLimitError } from 'openai'

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

export interface GroqConfig {
  apiKey: string
  /** Chat model that writes the summary. */
  model: string
  /** Speech-to-text model that produces the transcript. */
  transcriptionModel: string
  /** How much of the transcript is sent to the chat model. */
  characterLimit: number
}

const MAX_ATTEMPTS = 5

/**
 * Shared factory for every Groq client in the worker (transcription + summary).
 * Fail-closed: without an apiKey it throws, so the worker refuses to start
 * rather than run without AI.
 *
 * `keepAlive: false` is deliberate: the SDK's default Node agent pools
 * connections for up to 5 minutes, but Groq's edge closes idle ones sooner — a
 * call made after any real gap (normal in production, rare when testing
 * requests back-to-back) can land on a socket the other side already closed,
 * surfacing as "Premature close". A fresh connection per call costs a
 * handshake, irrelevant next to the seconds this pipeline already takes.
 */
export function createGroqClient(apiKey: string): OpenAI {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY missing — the worker refuses to start without the key (fail-closed).')
  }
  return new OpenAI({ apiKey, baseURL: GROQ_BASE_URL, httpAgent: new HttpsAgent({ keepAlive: false }) })
}

/**
 * Runs a Groq call with the retry policy both adapters share. 429 (rate limit),
 * 5xx and connection-level failures (dropped/reset socket, premature close) are
 * transient — worth retrying. 4xx client errors (bad key, bad request) are not,
 * and retrying them only delays the failure the user needs to see.
 */
export async function callWithRetry<T>(operation: () => Promise<T>, what: string): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) break
      await wait(backoffMs(attempt))
    }
  }

  throw new Error(`Failed to call Groq (${what}): ${errorMessage(lastError)}`)
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof RateLimitError || error instanceof APIConnectionError || error instanceof InternalServerError
  )
}

// Exponential: 5s, 10s, 20s, 40s (cap 60s).
function backoffMs(attempt: number): number {
  return Math.min(60_000, 5_000 * 2 ** (attempt - 1))
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
