import OpenAI from 'openai'
import { GeneratedSummary, SummaryGenerator, SummaryGeneratorInput } from '@summary/adapters'
import {
  CHAT_MODEL_FALLBACKS,
  GroqConfig,
  callWithRetry,
  createGroqClient,
  errorMessage,
  isModelUnavailable,
} from './groq-llm'
import { LlmSummaryRecord, toGeneratedSummary } from './summary-mapper'
import { templateFor } from './summary-prompts'

/**
 * The rules that hold for EVERY kind of audio. What changes per kind is what
 * goes in "topics" and "action_items" (see summary-prompts.ts) — the JSON shape
 * is the same for all of them, so the entity, the PDF and the screen stay one
 * thing instead of one per kind.
 */
function instructionsFor(kind?: string): string {
  const template = templateFor(kind)

  return `### MISSÃO: RESUMIR A TRANSCRIÇÃO DE UM ÁUDIO EM JSON

${template.context}

### REGRAS OBRIGATÓRIAS:
1. Escreva SEMPRE em português do Brasil, mesmo que o áudio esteja em outro idioma.
2. NÃO INVENTE informação. Use apenas o que está na transcrição.
   - Se a transcrição não disser algo, simplesmente não escreva sobre isso.
3. "headline": um título curto (no máximo 10 palavras) que diga do que é o áudio.
4. "overview": de 1 a 3 parágrafos em prosa contando o que foi dito, na ordem em
   que foi dito. É a parte que substitui ouvir o áudio inteiro.
5. "topics": ${template.topics}, no máximo 8 itens, uma frase curta cada.
6. "action_items": ${template.actionItems}, no máximo 8 itens. Se não houver nada
   disso, devolva uma lista vazia []. NÃO transforme um assunto qualquer em
   tarefa só pra preencher.
7. Nada de markdown dentro dos textos (sem **, sem #, sem bullets).

### FORMATO (devolva SOMENTE o JSON, sem markdown em volta):
{
  "headline": "string",
  "overview": "string",
  "topics": ["string"],
  "action_items": ["string"]
}`
}

function buildPrompt(input: SummaryGeneratorInput, characterLimit: number): string {
  return `${instructionsFor(input.kind)}

--- TÍTULO DADO PELO USUÁRIO ---
${input.recordingTitle}

--- TRANSCRIÇÃO ---
${input.transcript.slice(0, characterLimit)}
--------------------`
}

/**
 * The LLM port, implemented against Groq's chat completions — same client and
 * same API key as the transcription adapter next door.
 *
 * `response_format: json_object` plus a low temperature is what keeps the answer
 * parseable: a summary is not a place for creative formatting, and re-prompting
 * a model that wrapped its JSON in prose is a cost nobody needs.
 *
 * The model NAME is not a constant of the pipeline, it is a preference: Groq
 * retires models and gates others per account, and a key that is not entitled to
 * the configured one answers 404 on every single job — every audio FAILED, with
 * the real cause only in the worker log. So the configured model is tried first
 * and the known-good alternatives after it, and whichever the key accepts is
 * remembered for the rest of the process.
 */
export class GroqSummaryGenerator implements SummaryGenerator {
  private readonly client: OpenAI
  /** Configured model first, then the fallbacks — no duplicates. */
  private readonly candidates: string[]
  /** The one to try first: the last that worked, or the configured one. */
  private model: string

  constructor(private readonly config: GroqConfig) {
    this.client = createGroqClient(config.apiKey)
    this.candidates = [...new Set([config.model, ...CHAT_MODEL_FALLBACKS])]
    this.model = this.candidates[0]
  }

  async generate(input: SummaryGeneratorInput): Promise<GeneratedSummary> {
    const content = await this.complete(buildPrompt(input, this.config.characterLimit))

    // The model that ANSWERED, not the one that was configured: the summary row
    // records what actually wrote it.
    return toGeneratedSummary(parseSummaryJson(content), this.model)
  }

  /**
   * Asks the first candidate the key accepts. Only a "no such model / no access"
   * answer moves to the next one — any other failure is this call's failure and
   * is thrown as it is, because trying a different model would just spend the
   * quota on the same error.
   */
  private async complete(prompt: string): Promise<string> {
    const start = Math.max(0, this.candidates.indexOf(this.model))
    let lastError: unknown

    for (let index = start; index < this.candidates.length; index++) {
      const model = this.candidates[index]
      try {
        const content = await callWithRetry(() => this.ask(model, prompt), 'summary')
        if (model !== this.model) {
          console.warn(`[worker] summarizing with "${model}" from now on.`)
          this.model = model
        }
        return content
      } catch (error) {
        if (!isModelUnavailable(error)) throw error
        lastError = error
        console.warn(
          `[worker] Groq refused the model "${model}" for this API key (retired or not entitled).`,
        )
      }
    }

    throw new Error(
      `No Groq chat model is available for this API key. Tried: ${this.candidates.join(', ')}. Last answer: ${errorMessage(lastError)}`,
    )
  }

  private async ask(model: string, prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })
    const answer = response.choices[0]?.message?.content
    if (!answer) throw new Error('Groq returned an empty response.')
    return answer
  }
}

/**
 * Reads the JSON out of the answer.
 *
 * `response_format: json_object` is supposed to make this a plain `JSON.parse`,
 * and on the model we ask first it is. But the fallback list exists precisely so
 * the pipeline keeps running on a model nobody here has tried, and the two
 * things a model does to JSON are fencing it in ```json and saying a sentence
 * around it. Taking the outermost object is not inventing content — what the
 * model did not write is still missing afterwards, and the value objects still
 * refuse a summary that came back empty.
 */
export function parseSummaryJson(content: string): LlmSummaryRecord {
  const unfenced = content.replace(/```(?:json)?/gi, '')
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')

  try {
    return JSON.parse(start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced)
  } catch {
    throw new Error('The model did not return valid JSON.')
  }
}
