/**
 * READ projection of an answer to a question about a recording. It is never
 * stored — the model that answered travels with it because that is part of what
 * the answer is worth.
 */
export interface AskedAnswerDTO {
  answer: string
  model: string
}
