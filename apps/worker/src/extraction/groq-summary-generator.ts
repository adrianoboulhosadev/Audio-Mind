import OpenAI from 'openai'
import { GeneratedSummary, SummaryGenerator, SummaryGeneratorInput } from '@summary/adapters'
import {
  CHAT_MODEL_FALLBACKS,
  GroqCallError,
  GroqConfig,
  callWithRetry,
  createGroqClient,
  errorMessage,
  isModelUnavailable,
  readPositiveNumber,
} from './groq-llm'
import { LlmSummaryRecord, toGeneratedSummary } from './summary-mapper'
import { templateFor } from './summary-prompts'

/**
 * The ceiling for the ANSWER, in tokens.
 *
 * Set explicitly, never left to the provider's default: with
 * `response_format: json_object`, an answer that runs out of budget mid-document
 * comes back as a **400 json_validate_failed** ("max completion tokens reached
 * before generating a valid document") — which is not a retryable failure and
 * not a model problem, so it used to take the whole recording down with it. The
 * ask got much bigger when the prompt started demanding a real document, and
 * that is exactly when this started happening.
 *
 * It is an env var because it is a budget, and a budget belongs to the account:
 * the free Groq tier answers with `x-ratelimit-limit-tokens: 8000` a MINUTE, and
 * that window has to hold the transcript AND the answer.
 */
const MAX_COMPLETION_TOKENS = readPositiveNumber('GROQ_MAX_COMPLETION_TOKENS', 2_500)

/**
 * The rules that hold for EVERY kind of audio. What changes per kind is what
 * goes in "topics" and "action_items" (see summary-prompts.ts) — the JSON shape
 * is the same for all of them, so the entity, the PDF and the screen stay one
 * thing instead of one per kind.
 *
 * Every bullet is asked for as "Rótulo curto: explicação", and that shape is
 * load-bearing in two places at once: the mind map draws the LABEL (a node
 * holding three sentences is a paragraph in a box) and the document prints the
 * whole item, label in bold. Asking for one-liners was what made the PDF read
 * like a list of headings with nothing under them.
 *
 * Every quantity here is a FLOOR, and that is the whole lesson of the first
 * version: "de 3 a 6 parágrafos" and "de 1 a 3 frases" were read as ceilings and
 * answered with one of each. A model gives the least the instruction allows, so
 * the instruction has to say the least it accepts — and say WHY, or the floor is
 * padded with words instead of content (hence the "erro que você não pode
 * cometer" above).
 *
 * The `\n\n` in the overview is spelled out for the same reason: a model does
 * not put line breaks inside a JSON string unless it is told to, and without
 * them the renderer has a single justified wall of text to lay out.
 */
/**
 * How much is asked for. `full` is the document we want; `concise` is what is
 * asked on the SECOND try, after the first answer ran out of completion budget
 * mid-JSON. A shorter summary is worth having; a failed recording is not.
 */
export type SummaryDepth = 'full' | 'concise'

function instructionsFor(kind: string | undefined, depth: SummaryDepth): string {
  const template = templateFor(kind)
  const concise = depth === 'concise'

  return `### MISSÃO: RESUMIR A TRANSCRIÇÃO DE UM ÁUDIO EM JSON

${template.context}

### O QUE ESTÁ SENDO ESCRITO
Um DOCUMENTO que alguém vai ler no lugar de ouvir o áudio inteiro, e que também
vira um mapa mental. Não é uma ata de tópicos soltos nem um glossário: quem ler
tem que entender o assunto sem ter estado lá.

### O ERRO QUE VOCÊ NÃO PODE COMETER
Devolver frases genéricas que qualquer pessoa escreveria SEM ter ouvido o áudio.
Se o que você escreveu num item continuaria verdadeiro pra qualquer outro áudio
sobre o mesmo assunto, ele está errado — troque pelo que foi dito NESTE áudio:
o exemplo, o número, o nome, o motivo.

### REGRAS OBRIGATÓRIAS:
1. Escreva SEMPRE em português do Brasil, mesmo que o áudio esteja em outro idioma.
2. NÃO INVENTE informação. Use apenas o que está na transcrição.
   - Se a transcrição não disser algo, simplesmente não escreva sobre isso.
   - Nunca escreva "não foi mencionado", "não há informação": é só não escrever.
3. Preserve o CONCRETO: nomes de pessoas, números, valores, datas, prazos,
   exemplos e termos técnicos ditos no áudio. É isso que faz o documento valer.
4. "headline": um título curto (no máximo 10 palavras) que diga do que é o áudio.
5. "overview": ${concise ? 'NO MÍNIMO 2 parágrafos' : 'NO MÍNIMO 4 parágrafos, e quantos mais o áudio pedir'}.
   - **Separe cada parágrafo com uma linha em branco de verdade dentro da string
     (\n\n).** Um bloco único de texto está ERRADO.
   - No mínimo ${concise ? '180' : '350'} palavras no total, contando a mesma história na ordem em
     que foi contada: o contexto, o desenvolvimento com os exemplos dados, onde
     houve dúvida ou divergência, e como terminou.
   - Parágrafos de 4 a 7 frases. É a parte que substitui ouvir o áudio.
6. "topics": ${template.topics}. De ${concise ? '5 a 7' : '6 a 12'} itens, CADA UM no formato
   "Rótulo curto: explicação".
   - O rótulo tem de 2 a 5 palavras e vira um nó do mapa mental — precisa fazer
     sentido sozinho, sem o resto da frase.
   - A explicação tem ${concise ? 'de 1 a 2 frases' : 'NO MÍNIMO 2 frases (o normal são 3)'} e traz ${template.detail}.${
     concise ? '' : '\n   - Uma frase só é resposta ERRADA: o item fica parecendo um verbete.'
   }
   - Exemplo do formato: "Prazo do lançamento: ficou adiado para depois do
     fechamento do mês, porque o financeiro só libera os números no dia 5. A
     Carol lembrou que no ano passado subir antes do fechamento gerou dezessete
     chamados de suporte em dois dias."
7. "action_items": ${template.actionItems}. No máximo ${concise ? '5' : '8'} itens, no MESMO formato
   "Rótulo curto: explicação", dizendo quem ficou responsável e o prazo QUANDO
   isso foi dito no áudio. Se não houver nada disso, devolva uma lista vazia [].
   NÃO transforme um assunto qualquer em tarefa só pra preencher.
8. Nada de markdown dentro dos textos (sem **, sem #, sem bullets).

### FORMATO (devolva SOMENTE o JSON, sem markdown em volta):
{
  "headline": "string",
  "overview": "string com \n\n entre os parágrafos",
  "topics": ["string"],
  "action_items": ["string"]
}`
}

function buildPrompt(
  input: SummaryGeneratorInput,
  characterLimit: number,
  depth: SummaryDepth,
): string {
  return `${instructionsFor(input.kind, depth)}

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
    try {
      return await this.summarize(input, 'full')
    } catch (error) {
      // The answer did not FIT, which is not the same as the answer failing.
      // Asking again for a shorter document is the only move that still leaves
      // the user with a summary — the alternative is a failed recording over a
      // budget, and the audio would be re-transcribed on the retry for nothing.
      if (!isTruncatedJson(error)) throw error
      console.warn('[worker] the summary did not fit the answer budget; asking for a shorter one.')
      return await this.summarize(input, 'concise')
    }
  }

  private async summarize(
    input: SummaryGeneratorInput,
    depth: SummaryDepth,
  ): Promise<GeneratedSummary> {
    const content = await this.complete(buildPrompt(input, this.config.characterLimit, depth))

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
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    })
    const answer = response.choices[0]?.message?.content
    if (!answer) throw new Error('Groq returned an empty response.')
    return answer
  }
}

/**
 * Whether the answer was CUT OFF rather than wrong.
 *
 * Groq's shape for it, with `json_object` on: HTTP 400, code
 * `json_validate_failed`, and `failed_generation: "max completion tokens reached
 * before generating a valid document"`. It reads like a bad request — it is a
 * document that did not fit.
 */
export function isTruncatedJson(error: unknown): boolean {
  const message = error instanceof GroqCallError ? errorMessage(error.original) : errorMessage(error)
  return /json_validate_failed|Failed to generate JSON|max completion tokens reached/i.test(message)
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
