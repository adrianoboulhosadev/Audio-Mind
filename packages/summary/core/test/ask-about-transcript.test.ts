import { Errors } from 'shared'
import { AskAboutTranscript, TranscriptQuestion } from '../src'
import type { TranscriptAnswer, TranscriptQuestionAnswerer, TranscriptQuestionInput } from '../src'

/** Fake of the model: answers what the test loaded and records what it was
 * asked, so a test can check the transcript really reached the prompt. */
class AnswererInMemory implements TranscriptQuestionAnswerer {
  readonly calls: TranscriptQuestionInput[] = []

  constructor(private readonly text = 'O contrato vence em março.') {}

  async answer(input: TranscriptQuestionInput): Promise<TranscriptAnswer> {
    this.calls.push(input)
    return { text: this.text, model: 'openai/gpt-oss-120b' }
  }
}

const INPUT = {
  recordingTitle: 'Reunião com o locador',
  transcript: 'Falamos do contrato: vence em março.',
  question: '  Quando vence o contrato?  ',
}

test('answers from the transcript and says which model spoke', async () => {
  const answerer = new AnswererInMemory()

  const result = await new AskAboutTranscript(answerer).execute(INPUT)

  expect(result).toEqual({ answer: 'O contrato vence em março.', model: 'openai/gpt-oss-120b' })
  // The question reaches the model trimmed, and the transcript goes with it.
  expect(answerer.calls[0].question).toBe('Quando vence o contrato?')
  expect(answerer.calls[0].transcript).toBe(INPUT.transcript)
})

test('an empty question never reaches the model', async () => {
  const answerer = new AnswererInMemory()

  await expect(
    new AskAboutTranscript(answerer).execute({ ...INPUT, question: '   ' }),
  ).rejects.toMatchObject({ code: Errors.EMPTY_QUESTION })
  expect(answerer.calls).toHaveLength(0)
})

test('a question longer than a question is refused, and does not echo itself back', async () => {
  const answerer = new AnswererInMemory()

  await expect(
    new AskAboutTranscript(answerer).execute({
      ...INPUT,
      question: 'a'.repeat(TranscriptQuestion.MAX_LENGTH + 1),
    }),
  ).rejects.toMatchObject({ code: Errors.QUESTION_TOO_LONG, value: undefined })
})

test('an empty answer is a failure, not an empty box on screen', async () => {
  await expect(
    new AskAboutTranscript(new AnswererInMemory('   ')).execute(INPUT),
  ).rejects.toMatchObject({ code: Errors.EMPTY_ANSWER })
})
