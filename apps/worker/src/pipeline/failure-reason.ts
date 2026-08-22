import { DomainError, Errors } from 'shared'

/**
 * Turns whatever blew up into a sentence the OWNER of the audio can act on.
 *
 * This is the worker's copy, not a domain rule: the reason is stored on the
 * recording and repeated in the inbox line, and "a stack trace" is the one thing
 * it must never be — the user cannot do anything with `ECONNRESET`, but they can
 * do something with "o áudio não tem fala audível".
 *
 * The fallback is deliberately vague about the cause and precise about the next
 * step: an unknown failure is usually transient, and the retry button is right
 * there.
 */
const REASONS: Record<string, string> = {
  [Errors.EMPTY_TRANSCRIPT]:
    'Não consegui ouvir nenhuma fala nesse áudio. Confira se ele não está mudo ou muito baixo.',
  [Errors.TRANSCRIPT_TOO_LONG]: 'A transcrição desse áudio ficou grande demais para ser resumida.',
  [Errors.EMPTY_SUMMARY]: 'O modelo não conseguiu escrever um resumo para esse áudio.',
  [Errors.TOO_MANY_SUMMARY_ITEMS]: 'O modelo devolveu um resumo fora do formato esperado.',
  [Errors.SUMMARY_TEXT_TOO_LONG]: 'O modelo devolveu um resumo fora do formato esperado.',
  [Errors.UNSUPPORTED_AUDIO_FORMAT]: 'Esse formato de áudio não é aceito na transcrição.',
  [Errors.RECORDING_NOT_FOUND]: 'A gravação não foi encontrada.',
}

export const FALLBACK_REASON =
  'Não consegui processar esse áudio agora. Tente de novo em alguns minutos.'

export function failureReasonFor(error: unknown): string {
  if (error instanceof DomainError) return REASONS[error.code] ?? FALLBACK_REASON

  // A raw ENOENT means the audio file is not where the row says it is — worth
  // its own sentence, because retrying will never fix it.
  if (isFileMissing(error)) {
    return 'O arquivo de áudio não está mais disponível no servidor.'
  }

  return FALLBACK_REASON
}

function isFileMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ENOENT'
}
