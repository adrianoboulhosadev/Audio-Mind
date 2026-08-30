/**
 * Domain code -> what the user reads. The API never sends a sentence, only a
 * stable code (see DomainExceptionFilter), which is what lets the wording live
 * here, in Portuguese, next to the rest of the interface.
 */
export const GENERIC_ERROR_MESSAGE = 'Algo deu errado. Tente de novo.'

export const ERROR_MESSAGES: Record<string, string> = {
  // auth
  INVALID_EMAIL: 'E-mail inválido.',
  WEAK_PASSWORD: 'A senha precisa de 8 caracteres, uma maiúscula, um número e um símbolo.',
  NAME_TOO_LONG: 'Esse nome é longo demais.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com esse e-mail.',
  USER_NOT_FOUND: 'Conta não encontrada.',
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  NOT_AUTHENTICATED: 'Sua sessão expirou. Entre de novo.',
  INVALID_PASSWORD: 'A senha atual está incorreta.',
  PASSWORD_SAME_AS_PREVIOUS: 'A nova senha precisa ser diferente da atual.',
  INVALID_SESSION: 'Sua sessão expirou. Entre de novo.',
  REQUIRED_FIELD: 'Preencha todos os campos.',

  // recording
  RECORDING_NOT_FOUND: 'Gravação não encontrada.',
  RECORDING_TITLE_TOO_LONG: 'O título é longo demais.',
  UNSUPPORTED_AUDIO_FORMAT: 'Esse formato de áudio não é aceito.',
  AUDIO_TOO_LARGE: 'O áudio passa de 25 MB.',
  AUDIO_TOO_LONG: 'O áudio passa de 30 minutos.',
  INVALID_AUDIO_DURATION: 'Não consegui ler a duração desse áudio.',
  AUDIO_FILE_REQUIRED: 'Envie um arquivo de áudio.',
  INVALID_RECORDING_STATUS: 'Essa gravação está em outro estágio do processamento.',
  RECORDING_IN_PIPELINE: 'Essa gravação já está na fila. Espere ela terminar pra processar de novo.',

  // transcription / summary
  TRANSCRIPTION_NOT_FOUND: 'A transcrição ainda não está pronta.',
  EMPTY_TRANSCRIPT: 'Não consegui ouvir nenhuma fala nesse áudio.',
  SUMMARY_NOT_FOUND: 'O resumo ainda não está pronto.',
  EMPTY_SUMMARY: 'O modelo não conseguiu resumir esse áudio.',
  PDF_NOT_AVAILABLE: 'O PDF desse resumo ainda não foi gerado.',

  // sharing
  SHARE_LINK_NOT_FOUND: 'Esse link de compartilhamento não existe.',
  SHARE_LINK_EXPIRED: 'Esse link expirou.',
  SHARE_LINK_REVOKED: 'Esse link foi desativado.',
  INVALID_SHARE_TOKEN: 'Endereço de compartilhamento inválido.',

  // task
  TASK_NOT_FOUND: 'Tarefa não encontrada.',

  // notification
  NOTIFICATION_NOT_FOUND: 'Notificação não encontrada.',
}
