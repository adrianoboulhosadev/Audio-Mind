'use client'

import Link from 'next/link'
import { Check, ListTodo } from 'lucide-react'
import { Loading } from '@/components/loading'
import { formatRelative } from '@/lib/format'
import { useTasks } from './hooks/use-tasks'

/**
 * Everything the user still has to do, pulled out of every summary they have.
 *
 * Nothing on this screen costs an extra call to a model: the action items were
 * written (and paid for) when each audio was summarized — this is the difference
 * between "o app resume reuniões" and "o app me diz o que eu tenho que fazer".
 */
export default function TasksPage() {
  const { filters, filter, setFilter, groups, total, pendingCount, isLoading, toggle } = useTasks()

  if (isLoading) return <Loading />

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line2 p-1">
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                filter === option.id ? 'bg-accent text-accent-ink' : 'text-ink2 hover:text-ink'
              }`}
            >
              {option.label}
              {option.id === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">{total} nesta lista</span>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line2 px-4 py-12 text-center">
          <ListTodo size={28} className="mx-auto text-muted" aria-hidden />
          <p className="mt-3 text-sm text-muted">
            {filter === 'done'
              ? 'Você ainda não marcou nada como feito.'
              : 'Nada pendente. As tarefas aparecem aqui sozinhas, tiradas dos próximos passos de cada resumo.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.recordingId} className="rounded-xl border border-line2 bg-panel p-4">
              {/* O título é um link: a tarefa é uma frase tirada de um áudio, e
                  a pergunta seguinte é sempre "em que contexto isso foi dito?" */}
              <Link
                href={`/recordings/${group.recordingId}`}
                className="block truncate text-xs font-semibold uppercase tracking-wide text-muted transition hover:text-accent"
              >
                {group.recordingTitle}
              </Link>

              <ul className="mt-3 flex flex-col gap-1">
                {group.items.map(({ task }) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => toggle(task.id, !task.doneAt)}
                      aria-pressed={!!task.doneAt}
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-panel2"
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                          task.doneAt
                            ? 'border-good bg-good text-white'
                            : 'border-line2 text-transparent'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span
                        className={`min-w-0 flex-1 text-sm ${
                          task.doneAt ? 'text-muted line-through' : 'text-ink2'
                        }`}
                      >
                        {task.text}
                      </span>
                      {task.doneAt ? (
                        <span className="shrink-0 text-[11px] text-muted">
                          {formatRelative(task.doneAt)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
