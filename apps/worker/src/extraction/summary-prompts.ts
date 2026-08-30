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
  actionItems: string
}

const TEMPLATES: Record<string, KindTemplate> = {
  meeting: {
    context: 'Este áudio é uma REUNIÃO de trabalho.',
    topics: 'os assuntos discutidos e as decisões tomadas',
    actionItems:
      'o que ficou combinado de fazer, com quem ficou responsável e o prazo, quando isso foi dito',
  },
  class: {
    context: 'Este áudio é uma AULA ou palestra.',
    topics: 'os conceitos explicados, com a definição que o professor deu',
    actionItems:
      'o que foi passado pra estudar ou entregar (leituras, exercícios, provas, trabalhos) e as dúvidas que ficaram em aberto',
  },
  medical: {
    context: 'Este áudio é uma CONSULTA de saúde.',
    topics: 'os sintomas relatados, o que foi avaliado e o que o profissional explicou',
    actionItems:
      'as orientações a seguir: medicação (nome, dose e por quanto tempo), exames pedidos, cuidados e quando é o retorno',
  },
  interview: {
    context: 'Este áudio é uma ENTREVISTA.',
    topics: 'as perguntas feitas e o essencial de cada resposta, na ordem em que aconteceram',
    actionItems: 'o que ficou combinado entre as partes (próximos passos, prazos, envios)',
  },
  note: {
    context: 'Este áudio é um RECADO ou nota de voz de uma pessoa só.',
    topics: 'as ideias registradas',
    actionItems: 'o que a pessoa disse que precisa fazer, se disse algo assim',
  },
}

const GENERIC: KindTemplate = {
  context: 'Este áudio pode ser de qualquer tipo.',
  topics: 'os pontos principais',
  actionItems: 'só o que ficou combinado de FAZER (tarefa, decisão, prazo)',
}

/** FAIL-CLOSED: an unknown kind (or none) gets the generic template — never
 * someone else's. The domain already reads the column that way; this repeats it
 * because the value crosses a port as a plain string. */
export function templateFor(kind?: string): KindTemplate {
  return (kind && TEMPLATES[kind]) || GENERIC
}
