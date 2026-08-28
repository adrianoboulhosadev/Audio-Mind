import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: ReactNode
}

/**
 * forwardRef is NOT optional here: every form spreads `register(...)` onto this
 * component, and `ref` is the one key React strips from props instead of
 * passing through. Without forwarding it, react-hook-form never sees the input,
 * so a filled field submits as empty and the form answers "informe o campo" —
 * silently, since React only warns about the dropped ref in development.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className = '', ...props },
  ref,
) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink2">{label}</span>
      <input
        {...props}
        ref={ref}
        className={`w-full rounded-lg border border-line2 bg-panel2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent ${className}`}
      />
      {error ? <span className="mt-1.5 block text-xs text-bad">{error}</span> : null}
      {!error && hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
})
