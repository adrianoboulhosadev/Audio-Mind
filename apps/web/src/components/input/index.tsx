'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/**
 * The text box, alone — shadcn/ui's `Input`, painted with this app's palette.
 *
 * It carries no label and no error on purpose: that is `Field`'s job, and the
 * screens that need a bare box (the search bars, the question in the ask panel,
 * a note being edited in place) were each repeating the same twelve utility
 * classes with one of them a shade off.
 *
 * forwardRef is NOT optional: forms spread `register(...)` onto `Field`, which
 * hands the ref down to here. React strips `ref` from the props of a plain
 * function component, so dropping it means react-hook-form never sees the input
 * — the DOM fills, the library reads empty, and the form answers "informe o
 * campo". There is a test for exactly that.
 */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-line2 bg-panel2 px-3 py-2 text-sm text-ink outline-none transition',
          'placeholder:text-muted',
          'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft',
          'aria-[invalid=true]:border-bad',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
