'use client'

import Link from 'next/link'
import { Search, ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { Loading } from '@/components/loading'
import { useAuth } from '@/contexts/auth-context'
import { formatBytes, formatDateTime, formatRelative } from '@/lib/format'
import { PIPELINE_LABELS } from './data/status-labels'
import { useAdmin } from './hooks/use-admin'

/**
 * The administrator's screen: who is using this installation, how much disk it
 * is taking, and what has been failing.
 *
 * The failures are here because they are the one thing that is invisible
 * otherwise: each one is written on its own recording, in its own owner's
 * library, and only side by side do twenty of them stop being twenty separate
 * mysteries and become "a Groq aposentou o modelo".
 */
export default function AdminPage() {
  const { user } = useAuth()
  const { overview, users, isLoading, search, setSearch, setRole, setActive, saving } = useAdmin()

  if (isLoading || !overview) return <Loading />

  const { users: userStats, library, disk, failed } = overview

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Card title="Contas" value={String(userStats.total)}>
          {userStats.active} ativas · {userStats.admins} admin
        </Card>
        <Card title="Gravações" value={String(library.total)}>
          {formatBytes(library.storageBytes)} em áudio
        </Card>
        {/* Os dois números lado a lado de propósito: a diferença entre o que as
            LINHAS somam e o que está no disco é exatamente o que a faxina
            recolhe. */}
        <Card title="Disco" value={formatBytes(disk.totalBytes)}>
          {disk.audios.files} áudios · {disk.summaries.files} PDFs
        </Card>
      </section>

      <section className="rounded-2xl border border-line2 bg-panel p-5">
        <h2 className="text-sm font-semibold text-ink">Pipeline</h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {(Object.keys(PIPELINE_LABELS) as (keyof typeof PIPELINE_LABELS)[]).map((status) => (
            <li key={status} className="text-xs text-muted">
              <span className="mr-1.5 text-sm font-semibold text-ink tabular-nums">
                {library.byStatus[status]}
              </span>
              {PIPELINE_LABELS[status]}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line2 bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">
            Contas <span className="text-muted">({users.length})</span>
          </h2>
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              aria-label="Buscar contas"
              className="w-full rounded-lg border border-line2 bg-panel2 py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent"
            />
          </label>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {users.map((row) => {
            const isSelf = row.user.id === user?.id
            const isAdmin = row.user.role === 'admin'
            return (
              <li
                key={row.user.id}
                className={`rounded-xl border border-line2 px-3 py-3 ${row.user.active ? 'bg-panel2' : 'opacity-60'}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {row.user.name || row.user.email}
                    {isAdmin ? (
                      <span className="ml-2 rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                        admin
                      </span>
                    ) : null}
                    {!row.user.active ? (
                      <span className="ml-2 rounded-full border border-bad/40 bg-bad/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-bad">
                        desativada
                      </span>
                    ) : null}
                  </span>

                  {/* Nada disso aparece pra própria conta: o backend recusa (não
                      existe caminho de volta pra admin dentro do app), e um
                      botão que sempre dá erro é pior que botão nenhum. */}
                  {isSelf ? (
                    <span className="text-[11px] text-muted">você</span>
                  ) : (
                    <div className="-my-1.5 -mr-1.5 flex items-center">
                      <IconButton
                        label={isAdmin ? 'Tirar o admin' : 'Tornar admin'}
                        tone={isAdmin ? 'default' : 'accent'}
                        disabled={saving}
                        onClick={() => setRole(row.user.id, isAdmin ? 'user' : 'admin')}
                        icon={
                          isAdmin ? (
                            <ShieldOff size={16} aria-hidden />
                          ) : (
                            <ShieldCheck size={16} aria-hidden />
                          )
                        }
                      />
                      <IconButton
                        label={
                          row.user.active
                            ? 'Desativar a conta (não apaga nada)'
                            : 'Reativar a conta'
                        }
                        tone={row.user.active ? 'danger' : 'accent'}
                        tipSide="left"
                        disabled={saving}
                        onClick={() => setActive(row.user.id, !row.user.active)}
                        icon={
                          row.user.active ? (
                            <UserX size={16} aria-hidden />
                          ) : (
                            <UserCheck size={16} aria-hidden />
                          )
                        }
                      />
                    </div>
                  )}
                </div>

                <p className="mt-1 text-[11px] text-muted">
                  {row.user.email} · {row.recordings} áudios · {formatBytes(row.storageBytes)} ·
                  entrou {formatRelative(row.user.createdAt)}
                  {row.user.lastLoginAt
                    ? ` · último acesso ${formatRelative(row.user.lastLoginAt)}`
                    : ' · nunca acessou'}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-line2 bg-panel p-5">
        <h2 className="text-sm font-semibold text-ink">
          Falhas recentes <span className="text-muted">({failed.length})</span>
        </h2>

        {failed.length === 0 ? (
          <p className="mt-3 text-xs text-muted">Nenhuma gravação falhada. Bom sinal.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {failed.map((recording) => (
              <li key={recording.id} className="rounded-lg border border-bad/30 bg-bad/5 px-3 py-2">
                {/* O link só abre pro DONO: um admin clicando na gravação de
                    outra pessoa leva 404, e é isso mesmo — administrar a
                    instalação não é ler o áudio dos outros. */}
                <Link href={`/recordings/${recording.id}`} className="text-xs text-ink2">
                  {recording.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-bad">{recording.failureReason}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {formatDateTime(recording.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Um número grande com o rótulo em cima e uma linha de contexto embaixo. */
function Card({
  title,
  value,
  children,
}: {
  title: string
  value: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line2 bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{children}</p>
    </div>
  )
}
