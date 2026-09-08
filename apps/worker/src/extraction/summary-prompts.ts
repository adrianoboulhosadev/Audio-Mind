/**
 * The instructions the model gets, one set per KIND of audio.
 *
 * They live here and not in the summary context for the same reason the model id
 * and the retry policy do: a prompt is infrastructure. The domain knows
 * "transcript in, structured summary out" and passes the kind through as opaque
 * data — this file is the only place that knows what a "consulta médica" should
 * make the model look for.
 *
 * The JSON SHAPE never changes across kinds, only what goes in each field. That
 * is deliberate: making the sections polymorphic would mean the Summary entity,
 * the DTO, the PDF and the screen all growing a variant each, for a gain the
 * user would not see. What actually changes the quality of the answer is the
 * instructions — so those are what vary.
 */

/** What `topics` and `action_items` are called and made of, per kind. */
interface KindTemplate {
  /** One line naming the situation, so the model knows what it is listening to. */
  context: string
  topics: string
  /**
   * What has to be INSIDE each explanation for this kind of audio to be worth
   * reading. Without it the model answers with definitions anyone could write
   * without listening — which is exactly what a class summary came back as: a
   * glossary, with the professor's own examples left out.
   */
  detail: string
  actionItems: string
}

const TEMPLATES: Record<string, KindTemplate> = {
  meeting: {
    context: 'Este áudio é uma REUNIÃO de trabalho.',
    topics: 'os assuntos discutidos e as decisões tomadas',
    detail:
      'o que cada lado defendeu, o motivo que fez a decisão cair pra um lado, e os números, prazos e nomes ditos. Se houve divergência, ela precisa aparecer — reunião em que todo mundo concorda não existe',
    actionItems:
      'o que ficou combinado de fazer, com quem ficou responsável e o prazo, quando isso foi dito',
  },
  class: {
    context: 'Este áudio é uma AULA ou palestra.',
    topics: 'os conceitos explicados, um por item',
    detail:
      'a definição COM AS PALAVRAS DO PROFESSOR, o EXEMPLO que ele deu pra aquele conceito (é o exemplo que faz entender, e é o que se esquece primeiro), e o que ele avisou que costuma ser confundido ou cai na prova. Definição de dicionário não serve: quem lê quer a aula, não o verbete',
    actionItems:
      'o que foi passado pra estudar ou entregar (leituras, exercícios, provas, trabalhos) e as dúvidas que ficaram em aberto',
  },
  medical: {
    context: 'Este áudio é uma CONSULTA de saúde.',
    topics: 'os sintomas relatados, o que foi avaliado e o que o profissional explicou',
    detail:
      'há quanto tempo o sintoma acontece, o que o profissional disse que pode ser e o que ele descartou, e a explicação que ele deu — com as palavras dele, porque é o que a pessoa vai querer reler em casa',
    actionItems:
      'as orientações a seguir: medicação (nome, dose e por quanto tempo), exames pedidos, cuidados e quando é o retorno',
  },
  interview: {
    context: 'Este áudio é uma ENTREVISTA.',
    topics: 'as perguntas feitas e o essencial de cada resposta, na ordem em que aconteceram',
    detail:
      'o que a resposta trouxe de concreto — exemplo citado, número, história contada — e não só o assunto sobre o qual foi respondida',
    actionItems: 'o que ficou combinado entre as partes (próximos passos, prazos, envios)',
  },
  note: {
    context: 'Este áudio é um RECADO ou nota de voz de uma pessoa só.',
    topics: 'as ideias registradas',
    detail:
      'o raciocínio inteiro de cada ideia, não só o título dela: por que a pessoa pensou aquilo e o que ela concluiu',
    actionItems: 'o que a pessoa disse que precisa fazer, se disse algo assim',
  },
}

const GENERIC: KindTemplate = {
  context: 'Este áudio pode ser de qualquer tipo.',
  topics: 'os pontos principais',
  detail:
    'o que foi de fato dito sobre aquele ponto — exemplo, número, nome, motivo — e não uma frase que resuma o assunto por fora',
  actionItems: 'só o que ficou combinado de FAZER (tarefa, decisão, prazo)',
}

/** FAIL-CLOSED: an unknown kind (or none) gets the generic template — never
 * someone else's. The domain already reads the column that way; this repeats it
 * because the value crosses a port as a plain string. */
export function templateFor(kind?: string): KindTemplate {
  return (kind && TEMPLATES[kind]) || GENERIC
}
