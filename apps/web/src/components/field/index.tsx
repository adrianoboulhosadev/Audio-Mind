import type { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: ReactNode
}

export function Field({ label, error, hint, className = '', ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink2">{label}</span>
      <input
        {...props}
        className={`w-full rounded-lg border border-line2 bg-panel2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent ${className}`}
      />
      {error ? <span className="mt-1.5 block text-xs text-bad">{error}</span> : null}
      {!error && hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}
