import OpenAI from 'openai'
import { GeneratedSummary, SummaryGenerator, SummaryGeneratorInput } from '@summary/adapters'
import { GroqConfig, callWithRetry, createGroqClient } from './groq-llm'
import { LlmSummaryRecord, toGeneratedSummary } from './summary-mapper'

const INSTRUCTIONS = `### MISSÃO: RESUMIR A TRANSCRIÇÃO DE UM ÁUDIO EM JSON

### REGRAS OBRIGATÓRIAS:
1. Escreva SEMPRE em português do Brasil, mesmo que o áudio esteja em outro idioma.
2. NÃO INVENTE informação. Use apenas o que está na transcrição.
   - Se a transcrição não disser algo, simplesmente não escreva sobre isso.
3. "headline": um título curto (no máximo 10 palavras) que diga do que é o áudio.
4. "overview": de 1 a 3 parágrafos em prosa contando o que foi dito, na ordem em
   que foi dito. É a parte que substitui ouvir o áudio inteiro.
5. "topics": os pontos principais, no máximo 8 itens, uma frase curta cada.
6. "action_items": só o que ficou combinado de FAZER (tarefa, decisão, prazo),
   no máximo 8 itens. Se ninguém combinou nada, devolva uma lista vazia [].
   NÃO transforme um assunto qualquer em tarefa só pra preencher.
7. Nada de markdown dentro dos textos (sem **, sem #, sem bullets).

### FORMATO (devolva SOMENTE o JSON, sem markdown em volta):
{
  "headline": "string",
  "overview": "string",
  "topics": ["string"],
  "action_items": ["string"]
}`

function buildPrompt(input: SummaryGeneratorInput, characterLimit: number): string {
  return `${INSTRUCTIONS}

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
 */
export class GroqSummaryGenerator implements SummaryGenerator {
  private readonly client: OpenAI

  constructor(private readonly config: GroqConfig) {
    this.client = createGroqClient(config.apiKey)
  }

  async generate(input: SummaryGeneratorInput): Promise<GeneratedSummary> {
    const content = await callWithRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: buildPrompt(input, this.config.characterLimit) }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })
      const answer = response.choices[0]?.message?.content
      if (!answer) throw new Error('Groq returned an empty response.')
      return answer
    }, 'summary')

    let record: LlmSummaryRecord
    try {
      record = JSON.parse(content) as LlmSummaryRecord
    } catch {
      throw new Error('The model did not return valid JSON.')
    }

    return toGeneratedSummary(record, this.config.model)
  }
}
