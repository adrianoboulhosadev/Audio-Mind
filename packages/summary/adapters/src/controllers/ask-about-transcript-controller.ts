import { AskAboutTranscript, AskedAnswerDTO, TranscriptQuestionAnswerer } from '@summary/core'

export default class AskAboutTranscriptController {
  constructor(private readonly answerer: TranscriptQuestionAnswerer) {}

  async execute(input: {
    recordingTitle: string
    transcript: string
    question: string
    language?: string
  }): Promise<AskedAnswerDTO> {
    return new AskAboutTranscript(this.answerer).execute(input)
  }
}
