'use client'

import { Sparkles } from 'lucide-react'
import { TranscriptQuestion } from '@summary/adapters'
import { Button } from '@/components/button'
import { useAskPanel } from './hooks/use-ask-panel'

/**
 * "Ask this recording".
 *
 * The transcript is already stored and already fits in a model's context, so
 * answering a question about it costs one call and no new infrastructure — no
 * embeddings, no vector store, no second copy of the text. The prompt says the
 * transcript is the only source and that "não está no áudio" is a valid answer,
 * because a summarizer that invents the answer is worse than one that says it
 * does not know.
 */
export function AskPanel({ recordingId }: { recordingId: string }) {
  const { question, setQuestion, thread, asking, submit } = useAskPanel(recordingId)

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sparkles size={15} className="text-accent" aria-hidden />
        Perguntar sobre esse áudio
      </h3>
      <p className="mt-1 text-xs text-muted">
        Respondo só com o que foi dito aqui. Se não estiver no áudio, eu falo que não está.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="mt-4 flex flex-wrap items-end gap-2"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          // The ceiling comes from the value object itself: a UI that let people
          // type past what the domain accepts would only promise a rejection.
          maxLength={TranscriptQuestion.MAX_LENGTH}
          placeholder="O que ficou combinado?"
          aria-label="Sua pergunta sobre esse áudio"
          className="min-w-0 flex-1 rounded-lg border border-line2 bg-panel2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent"
        />
        <Button type="submit" disabled={asking || !question.trim()}>
          {asking ? 'Pensando…' : 'Perguntar'}
        </Button>
      </form>

      {thread.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
          {thread.map((exchange, index) => (
            <li key={`${index}-${exchange.question}`} className="animate-fadeUp">
              <p className="text-xs font-medium text-muted">{exchange.question}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink2">
                {exchange.answer}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
