/**
 * Why a link is not opening, in the visitor's words.
 *
 * A map and not one generic sentence: only somebody who already holds a real
 * token ever sees "expirou" or "o dono revogou", and being told which one it is
 * is the difference between asking for a new link and concluding the app is
 * broken.
 */
export const SHARE_FAILURES: Record<string, { title: string; body: string }> = {
  SHARE_LINK_EXPIRED: {
    title: 'Esse link expirou',
    body: 'Todo link de compartilhamento tem prazo. Peça um novo pra quem te mandou.',
  },
  SHARE_LINK_REVOKED: {
    title: 'Esse link foi desativado',
    body: 'Quem compartilhou cancelou o acesso a esse resumo.',
  },
  SUMMARY_NOT_FOUND: {
    title: 'O resumo ainda não está pronto',
    body: 'Esse áudio ainda está sendo processado. Tente de novo daqui a pouco.',
  },
}

export const UNKNOWN_SHARE_FAILURE = {
  title: 'Link não encontrado',
  body: 'Confira se o endereço veio completo — falta um pedaço com frequência quando o link é colado.',
}
