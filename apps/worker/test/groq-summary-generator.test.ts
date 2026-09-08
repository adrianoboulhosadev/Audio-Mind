import {
  GroqSummaryGenerator,
  isTruncatedJson,
  parseSummaryJson,
} from '../src/extraction/groq-summary-generator'
import { GroqConfig } from '../src/extraction'
import { GroqCallError, readPositiveNumber } from '../src/extraction/groq-llm'

const CONFIG: GroqConfig = {
  apiKey: 'test-key',
  model: 'openai/gpt-oss-120b',
  transcriptionModel: 'whisper-large-v3',
  characterLimit: 1000,
}

const ANSWER = JSON.stringify({
  headline: 'Reunião',
  overview: 'O time revisou as entregas.',
  topics: ['Entregas'],
  action_items: [],
})

/** The exact 404 Groq answers for a model the key cannot use. */
function refusal(model: string): Error {
  return new Error(`404 The model \`${model}\` does not exist or you do not have access to it.`)
}

/**
 * The exact 400 Groq answers when `json_object` is on and the model ran out of
 * completion budget before closing the document. Copied from a real worker log.
 */
function truncated(): Error {
  return new Error(
    "400 Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.",
  )
}

/**
 * Stands in for the OpenAI SDK client the generator builds in its constructor:
 * `answer` decides, per model, whether Groq accepts the call. Records every
 * model asked, which is what these tests are actually about.
 */
function stubClient(
  generator: GroqSummaryGenerator,
  answer: (model: string, prompt: string) => string,
) {
  const asked: string[] = []
  const create = async ({
    model,
    messages,
  }: {
    model: string
    messages: { content: string }[]
  }) => {
    asked.push(model)
    return { choices: [{ message: { content: answer(model, messages[0].content) } }] }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(generator as any).client = { chat: { completions: { create } } }
  return asked
}

const input = { recordingTitle: 'Reunião', transcript: 'oi', language: 'pt' }

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('falls back to the next model when the key is not entitled to the configured one', async () => {
  const generator = new GroqSummaryGenerator(CONFIG)
  const asked = stubClient(generator, (model) => {
    if (model === CONFIG.model) throw refusal(model)
    return ANSWER
  })

  const summary = await generator.generate(input)

  expect(asked).toEqual([CONFIG.model, 'openai/gpt-oss-20b'])
  // The row records what actually wrote the summary, not what was configured.
  expect(summary.model).toBe('openai/gpt-oss-20b')
})

test('remembers the model that worked — the next audio does not pay the refusal again', async () => {
  const generator = new GroqSummaryGenerator(CONFIG)
  const asked = stubClient(generator, (model) => {
    if (model === CONFIG.model) throw refusal(model)
    return ANSWER
  })

  await generator.generate(input)
  asked.length = 0
  await generator.generate(input)

  expect(asked).toEqual(['openai/gpt-oss-20b'])
})

test('a failure that is NOT about the model is thrown as it is, without spending another model', async () => {
  const generator = new GroqSummaryGenerator(CONFIG)
  const asked = stubClient(generator, () => {
    throw new Error('400 invalid request')
  })

  await expect(generator.generate(input)).rejects.toThrow('400 invalid request')
  expect(asked).toEqual([CONFIG.model])
})

test('gives up with a sentence naming every model tried', async () => {
  const generator = new GroqSummaryGenerator(CONFIG)
  stubClient(generator, (model) => {
    throw refusal(model)
  })

  await expect(generator.generate(input)).rejects.toThrow(
    /No Groq chat model is available for this API key/,
  )
})

test('a model this key no longer has (an old GROQ_MODEL in .env) is skipped, not fatal', async () => {
  // Exactly the state a worker boots in after Groq retires the configured
  // model: the .env still names it, the key cannot use it any more.
  const generator = new GroqSummaryGenerator({ ...CONFIG, model: 'llama-3.3-70b-versatile' })
  const asked = stubClient(generator, (model) => {
    if (model.startsWith('llama')) throw refusal(model)
    return ANSWER
  })

  const summary = await generator.generate(input)

  expect(asked).toEqual(['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'])
  expect(summary.model).toBe('openai/gpt-oss-120b')
})

test('reads the JSON even when the model fences it or talks around it', () => {
  expect(parseSummaryJson('```json\n{"headline":"oi"}\n```')).toEqual({ headline: 'oi' })
  expect(parseSummaryJson('Claro! {"headline":"oi"} Espero ter ajudado.')).toEqual({
    headline: 'oi',
  })
})

test('an answer with no JSON at all fails — it does not become an empty summary', () => {
  expect(() => parseSummaryJson('não consegui resumir')).toThrow('did not return valid JSON')
})

describe('resposta que nao coube no orcamento', () => {
  it('pede um resumo MENOR em vez de derrubar a gravacao', () => {
    // O caso real: pedir um documento inteiro estourou o teto de saida e o JSON
    // voltou cortado. Uma gravacao falhada por causa de orcamento faria o audio
    // ser transcrito de novo na retentativa, de graca.
    expect(isTruncatedJson(truncated())).toBe(true)
    expect(isTruncatedJson(new GroqCallError('wrapped', truncated()))).toBe(true)
    expect(isTruncatedJson(new Error('401 invalid api key'))).toBe(false)
  })

  it('a segunda tentativa pede menos texto, e vale como resumo', async () => {
    const generator = new GroqSummaryGenerator(CONFIG)
    const prompts: string[] = []
    stubClient(generator, (_model, prompt) => {
      prompts.push(prompt)
      if (prompts.length === 1) throw truncated()
      return ANSWER
    })

    const summary = await generator.generate(input)

    expect(summary.model).toBe(CONFIG.model)
    // O primeiro pede o documento; o segundo pede o que cabe.
    expect(prompts[0]).toContain('NO MÍNIMO 4 parágrafos')
    expect(prompts[1]).toContain('NO MÍNIMO 2 parágrafos')
    expect(prompts[1]).toContain('De 5 a 7 itens')
  })

  it('so tenta encurtar UMA vez — cortar de novo e falha de verdade', async () => {
    const generator = new GroqSummaryGenerator(CONFIG)
    const asked = stubClient(generator, () => {
      throw truncated()
    })

    await expect(generator.generate(input)).rejects.toThrow(/Failed to generate JSON/)
    // Uma chamada por tentativa, e nenhuma corrida pela lista de modelos: o
    // problema nunca foi o modelo.
    expect(asked).toEqual([CONFIG.model, CONFIG.model])
  })

  it('manda um teto de saida explicito, nunca o default do provedor', async () => {
    const generator = new GroqSummaryGenerator(CONFIG)
    let sent: Record<string, unknown> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(generator as any).client = {
      chat: {
        completions: {
          create: async (body: Record<string, unknown>) => {
            sent = body
            return { choices: [{ message: { content: ANSWER } }] }
          },
        },
      },
    }

    await generator.generate(input)

    expect(sent.max_completion_tokens).toBeGreaterThan(0)
    expect(sent.response_format).toEqual({ type: 'json_object' })
  })
})

describe('readPositiveNumber', () => {
  const NAME = 'TEST_BUDGET'

  afterEach(() => {
    delete process.env[NAME]
  })

  it('le o numero quando ele esta la', () => {
    process.env[NAME] = '1200'
    expect(readPositiveNumber(NAME, 99)).toBe(1200)
  })

  it('variavel VAZIA cai no default — nao vira zero', () => {
    // `X=` no .env nao e undefined, entao `??` nao pega, e Number('') e 0. Com
    // TRANSCRIPT_CHAR_LIMIT isso mandaria uma transcricao VAZIA pro modelo, que
    // escreveria um resumo sobre nada sem erro nenhum aparecer.
    process.env[NAME] = ''
    expect(readPositiveNumber(NAME, 99)).toBe(99)
  })

  it('lixo, zero e negativo tambem caem no default', () => {
    for (const value of ['abc', '0', '-5']) {
      process.env[NAME] = value
      expect(readPositiveNumber(NAME, 99)).toBe(99)
    }
  })

  it('ausente cai no default', () => {
    expect(readPositiveNumber(NAME, 99)).toBe(99)
  })
})
