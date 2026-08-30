import { forwardRef } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
  hint?: ReactNode
}

/**
 * A labelled `<select>` in the app's palette — the same box as `Field`, so a
 * form that mixes the two lines up.
 *
 * forwardRef for the same reason Field has it: the day one of these is
 * registered with react-hook-form, a dropped ref would submit an empty value and
 * only warn in development.
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, options, hint, className = '', ...props },
  ref,
) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink2">{label}</span>
      <select
        {...props}
        ref={ref}
        className={`w-full rounded-lg border border-line2 bg-panel2 px-3 py-2 text-sm text-ink outline-none transition focus:border-accent ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
})
