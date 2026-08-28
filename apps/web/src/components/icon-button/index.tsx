'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type IconButtonTone = 'default' | 'accent' | 'danger'

const TONE_CLASSES: Record<IconButtonTone, string> = {
  default: 'text-ink2 hover:bg-panel2 hover:text-ink',
  accent: 'text-accent hover:bg-accent-soft',
  danger: 'text-muted hover:bg-panel2 hover:text-bad',
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** What the button does, in the user's words. It is the accessible name AND
   * the tooltip — one string, so they can never drift apart. */
  label: string
  icon: ReactNode
  tone?: IconButtonTone
  /**
   * Which side the tooltip opens on. A wide tooltip centred over a button near
   * the right edge does not just look wrong — being absolutely positioned, it
   * widens the document and makes the whole PAGE scroll sideways on a phone. So
   * anything in a right-aligned group opens to the left.
   */
  tipSide?: 'top' | 'left'
}

/**
 * An action reduced to its icon, with the words it replaced still reachable.
 *
 * The tooltip is CSS on a sibling span, not a library and not the native
 * `title=`: `title` waits about a second, cannot be styled to match the panel,
 * and never appears for a keyboard user. This one shows on hover AND on
 * focus-visible, which is the whole reason an icon-only button is acceptable at
 * all — without it the icon is a guess.
 */
export function IconButton({
  label,
  icon,
  tone = 'default',
  tipSide = 'top',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className={`inline-flex items-center justify-center rounded-lg p-2 transition ${TONE_CLASSES[tone]} disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
        {...props}
      >
        {icon}
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-30 whitespace-nowrap rounded-md border border-line2 bg-panel2 px-2 py-1 text-xs text-ink opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${
          tipSide === 'left'
            ? 'right-full top-1/2 mr-2 -translate-y-1/2'
            : 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'
        }`}
      >
        {label}
      </span>
    </span>
  )
}
