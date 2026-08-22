'use client'

import Link from 'next/link'
import { NAV_ITEMS } from './data/nav-items'
import { ICONS } from './data/icons'
import { useSidebar } from './hooks/use-sidebar'

/**
 * A fixed COLUMN from `lg` up, a DRAWER below it. While it was a column at every
 * width, even a narrow one ate the phone's screen and squeezed every page next
 * to it — which is what breaks a layout on mobile, not the width of the content.
 */
export function Sidebar() {
  const { open, close, isActive } = useSidebar()

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={close}
          className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-60 flex-col border-r border-line bg-panel transition-transform lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-line px-5">
          <Link href="/recordings" className="flex items-center gap-2 text-ink">
            <span className="text-accent">{ICONS.wave}</span>
            <span className="text-sm font-semibold tracking-wide">Audio-Mind</span>
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar menu"
            className="text-muted hover:text-ink lg:hidden"
          >
            {ICONS.close}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                isActive(item.href)
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink2 hover:bg-panel2 hover:text-ink'
              }`}
            >
              {ICONS[item.icon]}
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="px-5 pb-5 text-xs leading-relaxed text-muted">
          Grave ou envie um áudio e receba a transcrição, o resumo e o PDF.
        </p>
      </aside>
    </>
  )
}
