import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Agent as HttpsAgent } from 'node:https'
import OpenAI, { NotFoundError } from 'openai'
import { Errors, ServiceUnavailableError } from 'shared'
import { TranscriptAnswer, TranscriptQuestionAnswerer, TranscriptQuestionInput } from '@summary/adapters'

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

/**
 * Same list, same reason as the worker's (apps/worker/src/extraction/groq-llm.ts):
 * Groq retires models and gates others per account, so the configured name is a
 * preference, not a promise. Duplicated rather than shared because a driven
 * adapter lives in the app that consumes the port — the same price already paid
 * for having two Prisma repositories over one table.
 */
const CHAT_MODEL_FALLBACKS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
]

/**
 * How much of the transcript goes into the prompt. Same knob the worker uses.
 *
 * Read defensively for the reason the worker spells out: `TRANSCRIPT_CHAR_LIMIT=`
 * (present but empty) is not `undefined`, so `??` misses it and `Number('')` is
 * 0 — which would slice the transcript down to NOTHING and answer questions
 * about an empty text, silently.
 */
const CHARACTER_LIMIT = readPositiveNumber('TRANSCRIPT_CHAR_LIMIT', 24_000)

function readPositiveNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function buildPrompt(input: TranscriptQuestionInput): string {
  return `### MISSÃO: RESPONDER UMA PERGUNTA SOBRE UM ÁUDIO

### REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE em português do Brasil.
2. Use APENAS a transcrição abaixo. Ela é a única fonte.
3. Se a resposta NÃO estiver na transcrição, diga exatamente isso — que esse
   áudio não fala sobre isso. NÃO invente, não complete com o que "costuma ser".
4. Seja direto: responda em no máximo um parágrafo curto, ou uma lista curta
   quando a pergunta pedir vários itens.
5. Quando fizer sentido, cite o trecho em que se baseou entre aspas.

--- TÍTULO DADO PELO USUÁRIO ---
${input.recordingTitle}

--- TRANSCRIÇÃO ---
${input.transcript.slice(0, CHARACTER_LIMIT)}
--------------------

--- PERGUNTA ---
${input.question}`
}

/**
 * The question-answering port, against Groq's chat completions.
 *
 * `keepAlive: false` for the same reason the worker does it: the SDK's default
 * Node agent pools connections for minutes, Groq's edge closes idle ones sooner,
 * and a long-lived process eventually writes to a socket the other side already
 * dropped ("Premature close").
 *
 * No JSON mode here — the answer IS prose, and asking for a JSON envelope would
 * only add a way for it to arrive malformed.
 *
 * Every way this can fail leaves as AI_UNAVAILABLE, a DOMAIN error, so the
 * screen shows "a IA está indisponível" instead of the filter's deliberately
 * vague UNKNOWN_ERROR. The cause never travels in the response — it is logged
 * here, which is the only place it exists.
 */
@Injectable()
export class GroqQuestionAnswerer implements TranscriptQuestionAnswerer, OnModuleInit {
  private readonly logger = new Logger(GroqQuestionAnswerer.name)
  private model = process.env.GROQ_MODEL ?? CHAT_MODEL_FALLBACKS[0]

  /**
   * Says at BOOT that this feature is off, instead of letting the first person
   * to ask a question be the one who finds out. Not fail-closed like the worker
   * (which without AI would have nothing to do): the API has plenty of routes
   * that need no model, and refusing to start would take the whole app down
   * over one feature.
   */
  onModuleInit(): void {
    if (!process.env.GROQ_API_KEY) {
      this.logger.warn(
        'GROQ_API_KEY is not set for the BACKEND (apps/backend/.env) — asking questions about a ' +
          'recording will answer AI_UNAVAILABLE. It is the same key the worker uses; setting it in ' +
          "the worker's .env alone is not enough, they are separate processes.",
      )
    }
  }

  async answer(input: TranscriptQuestionInput): Promise<TranscriptAnswer> {
    const apiKey = process.env.GROQ_API_KEY ?? ''
    if (!apiKey) {
      this.logger.error(
        'GROQ_API_KEY missing — the backend cannot answer questions without it. Set it in ' +
          'apps/backend/.env (the same key the worker uses) and restart the container.',
      )
      ServiceUnavailableError.throwError(Errors.AI_UNAVAILABLE)
    }

    const client = new OpenAI({
      apiKey,
      baseURL: GROQ_BASE_URL,
      httpAgent: new HttpsAgent({ keepAlive: false }),
    })

    const candidates = [...new Set([this.model, ...CHAT_MODEL_FALLBACKS])]
    let lastError: unknown

    for (const model of candidates) {
      try {
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: buildPrompt(input) }],
          temperature: 0.2,
        })
        // Remember what worked, so the next question starts there.
        this.model = model
        return { text: response.choices[0]?.message?.content ?? '', model }
      } catch (error) {
        // Only "no such model / no access" moves on; anything else is this
        // call's failure and trying another model would spend the quota on the
        // same error.
        if (!isModelUnavailable(error)) {
          this.logger.error(
            `Groq failed to answer with the model "${model}": ${messageOf(error)}`,
            error instanceof Error ? error.stack : undefined,
          )
          ServiceUnavailableError.throwError(Errors.AI_UNAVAILABLE)
        }
        lastError = error
        this.logger.warn(`Groq refused the model "${model}" for this API key.`)
      }
    }

    this.logger.error(
      `No Groq chat model is available for this API key. Tried: ${candidates.join(', ')}. ` +
        `Last answer: ${messageOf(lastError)}`,
    )
    ServiceUnavailableError.throwError(Errors.AI_UNAVAILABLE)
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isModelUnavailable(error: unknown): boolean {
  if (error instanceof NotFoundError) return true
  const message = error instanceof Error ? error.message : String(error)
  return /does not exist or you do not have access|model[_ ]not[_ ]found|decommissioned/i.test(message)
}
