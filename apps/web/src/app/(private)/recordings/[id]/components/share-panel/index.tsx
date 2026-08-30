'use client'

import { Copy, Link2, Link2Off } from 'lucide-react'
import { SHARE_WINDOWS, type ShareWindow } from '@sharing/adapters'
import { Button } from '@/components/button'
import { IconButton } from '@/components/icon-button'
import { SelectField } from '@/components/select-field'
import { formatDateTime, formatRelative } from '@/lib/format'
import { SHARE_WINDOW_LABELS } from './data/share-windows'
import { useSharePanel } from './hooks/use-share-panel'

/**
 * Handing the summary to somebody who has no account here.
 *
 * Three things are said out loud rather than buried in a setting: what goes in
 * the link (the summary, and only what is ticked beyond it), when it dies, and
 * which links are still alive. The list is the part that makes "revogar" a real
 * promise — a share button with nothing behind it means the only record of what
 * you gave away is your memory.
 */
export function SharePanel({ recordingId }: { recordingId: string }) {
  const {
    links,
    window,
    setWindow,
    includesTranscript,
    setIncludesTranscript,
    includesAudio,
    setIncludesAudio,
    create,
    creating,
    revoke,
    urlFor,
    copy,
  } = useSharePanel(recordingId)

  const active = links.filter((link) => !link.revokedAt && new Date(link.expiresAt) > new Date())

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <Link2 size={18} className="text-accent" aria-hidden />
        Compartilhar
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Gera um endereço que abre <strong className="text-ink2">só o resumo deste áudio</strong>, sem
        precisar de conta. Todo link tem prazo e pode ser desativado por você a qualquer momento.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1">
          <SelectField
            label="Vale por"
            value={window}
            onChange={(event) => setWindow(event.target.value as ShareWindow)}
            options={SHARE_WINDOWS.map((option) => ({
              value: option,
              label: SHARE_WINDOW_LABELS[option],
            }))}
          />
        </div>
        <Button onClick={create} disabled={creating}>
          {creating ? 'Gerando…' : 'Gerar link'}
        </Button>
      </div>

      {/* Opt-in explícito, um de cada vez: a transcrição é cada palavra que
          alguém falou e o áudio é a voz da pessoa — não é a mesma coisa que "o
          resumo que eu escrevi sobre a reunião". */}
      <div className="mt-3 flex flex-col gap-2">
        <Toggle
          checked={includesTranscript}
          onChange={setIncludesTranscript}
          label="Incluir a transcrição (tudo o que foi dito, palavra por palavra)"
        />
        <Toggle
          checked={includesAudio}
          onChange={setIncludesAudio}
          label="Incluir o áudio (quem abrir vai poder ouvir a gravação)"
        />
      </div>

      {links.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2 border-t border-line2 pt-4">
          {links.map((link) => {
            const expired = new Date(link.expiresAt) <= new Date()
            const dead = !!link.revokedAt || expired
            return (
              <li
                key={link.id}
                className={`rounded-lg border border-line2 px-3 py-2 ${dead ? 'opacity-60' : 'bg-panel2'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-ink2">
                    {urlFor(link.token)}
                  </span>
                  {!dead ? (
                    <IconButton
                      label="Copiar link"
                      tone="accent"
                      onClick={() => copy(link.token)}
                      icon={<Copy size={16} aria-hidden />}
                    />
                  ) : null}
                  {!link.revokedAt ? (
                    <IconButton
                      label="Desativar link"
                      tone="danger"
                      tipSide="left"
                      onClick={() => revoke(link.id)}
                      icon={<Link2Off size={16} aria-hidden />}
                    />
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {link.revokedAt
                    ? `Desativado ${formatRelative(link.revokedAt)}`
                    : expired
                      ? `Expirou ${formatRelative(link.expiresAt)}`
                      : `Expira em ${formatDateTime(link.expiresAt)}`}
                  {' · '}
                  {describeScope(link.includesTranscript, link.includesAudio)}
                  {' · '}
                  {link.viewCount === 0 ? 'nunca aberto' : `aberto ${link.viewCount}×`}
                </p>
              </li>
            )
          })}
        </ul>
      ) : null}

      {links.length > 0 && active.length === 0 ? (
        <p className="mt-3 text-xs text-muted">Nenhum link ativo agora.</p>
      ) : null}
    </section>
  )
}

/** Um checkbox com o rótulo clicável, na paleta. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      {label}
    </label>
  )
}

/** O que aquele link entrega, em uma expressão. */
function describeScope(transcript: boolean, audio: boolean): string {
  if (transcript && audio) return 'resumo, transcrição e áudio'
  if (transcript) return 'resumo e transcrição'
  if (audio) return 'resumo e áudio'
  return 'só o resumo'
}
