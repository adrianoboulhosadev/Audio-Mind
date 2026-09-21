'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { ChevronRight, LogOut } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { NotificationBell } from '@/components/notification-bell'
import { useHeader } from './hooks/use-header'

export function Header() {
  const { crumbs, user, logout } = useHeader()

  return (
    /* `sticky top-0` e não `relative`: descendo uma hora de transcrição, a única
       coisa que diz onde você está — e o sino, e o sair — saía de vista.

       O `z-50` não é decoração: o `backdrop-blur` faz do header um stacking
       context próprio, e sem z-index ele fica no mesmo nível do conteúdo que vem
       DEPOIS dele no DOM — então o painel do sino, por mais z-50 que tenha lá
       dentro, era pintado por baixo dos cards e da barra inferior. Levantar o
       header inteiro é o que tira o painel de baixo. */
    <header className="sticky top-0 z-50 flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-panel/80 px-4 py-3 backdrop-blur sm:px-6">
      {/* A trilha É o título da tela, então continua sendo UM `h1`: quebrar em
          `nav > ol` deixaria toda página privada sem cabeçalho de primeiro
          nível, que é pior pra quem navega por leitor de tela do que a trilha
          resolve. */}
      <nav aria-label="Trilha de navegação" className="min-w-0 flex-1">
        <h1 className="flex min-w-0 items-center gap-1.5 text-base font-semibold text-ink">
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.href ?? index}>
              {index > 0 ? (
                <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />
              ) : null}
              {crumb.href ? (
                // O passo de trás não encolhe: quem cede espaço é o título da
                // gravação, que é o texto longo e o que dá pra truncar sem
                // perder o caminho de volta.
                <Link
                  href={crumb.href}
                  className="shrink-0 whitespace-nowrap font-medium text-muted transition hover:text-ink"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="min-w-0 truncate">{crumb.label}</span>
              )}
            </Fragment>
          ))}
        </h1>
      </nav>

      {/* Roomier than the rest of the header on purpose: these three sit next to
          each other but do unrelated things, and "sair" is the one action here
          nobody wants to hit by accident. */}
      <div className="flex items-center gap-4 sm:gap-6">
        <NotificationBell />
        <span className="hidden max-w-[12rem] truncate text-sm text-muted sm:block">
          {user?.name || user?.email}
        </span>
        <IconButton
          label="Sair da conta"
          tipSide="left"
          onClick={() => logout()}
          icon={<LogOut size={18} aria-hidden />}
        />
      </div>
    </header>
  )
}
