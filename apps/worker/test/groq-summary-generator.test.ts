import { GroqSummaryGenerator, parseSummaryJson } from '../src/extraction/groq-summary-generator'
import { GroqConfig } from '../src/extraction'

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
 * Stands in for the OpenAI SDK client the generator builds in its constructor:
 * `answer` decides, per model, whether Groq accepts the call. Records every
 * model asked, which is what these tests are actually about.
 */
function stubClient(generator: GroqSummaryGenerator, answer: (model: string) => string) {
  const asked: string[] = []
  const create = async ({ model }: { model: string }) => {
    asked.push(model)
    return { choices: [{ message: { content: answer(model) } }] }
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
