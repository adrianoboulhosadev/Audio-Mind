import { UseCase, ValidationError, Errors } from 'shared'
import { AskedAnswerDTO, TranscriptQuestion } from '../model'
import { TranscriptQuestionAnswerer } from '../providers'

interface Input {
  recordingTitle: string
  transcript: string
  question: string
  language?: string
}

/**
 * Asks the model something about ONE recording, using its transcript as the
 * only source.
 *
 * Nothing is stored: the answer is a conversation about the recording, not a
 * new fact about it — and persisting it would raise the question of what
 * happens to it when the audio is reprocessed and the transcript changes.
 *
 * An empty answer is refused for the same reason an empty transcript is: the
 * user has to see that the model said nothing, instead of an empty box that
 * looks like the app broke.
 */
export default class AskAboutTranscript implements UseCase<Input, AskedAnswerDTO> {
  constructor(private readonly answerer: TranscriptQuestionAnswerer) {}

  async execute({ recordingTitle, transcript, question, language }: Input): Promise<AskedAnswerDTO> {
    // The value object is what validates the question — the use case only
    // orchestrates.
    const asked = new TranscriptQuestion(question)

    const answer = await this.answerer.answer({
      recordingTitle,
      transcript,
      question: asked.value,
      language,
    })

    const text = answer.text?.trim() ?? ''
    if (!text) ValidationError.throwError(Errors.EMPTY_ANSWER)

    return { answer: text, model: answer.model }
  }
}
