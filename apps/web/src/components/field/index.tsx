'use client'

import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Input } from '@/components/input'
import { Label } from '@/components/label'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: ReactNode
}

/**
 * A labelled text box: `Label` over `Input`, with the error or the hint under
 * it. The paint moved into `Input` so the bare boxes elsewhere (the search bars,
 * the ask panel) are the same control; what stays here is the LABELLING.
 *
 * It is `htmlFor`/`id` now instead of a wrapping `<label>`, which is what lets
 * the error be announced: `aria-describedby` has to point at an element, and an
 * input that is merely nested inside a label has nothing to point with.
 *
 * forwardRef is NOT optional here: every form spreads `register(...)` onto this
 * component, and `ref` is the one key React strips from props instead of
 * passing through. Without forwarding it, react-hook-form never sees the input,
 * so a filled field submits as empty and the form answers "informe o campo" —
 * silently, since React only warns about the dropped ref in development.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, id, className, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const message = error ?? hint

  return (
    <div className="block">
      <Label htmlFor={inputId} className="mb-1.5">
        {label}
      </Label>
      <Input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={className}
        {...props}
      />
      {message ? (
        <span id={messageId} className={`mt-1.5 block text-xs ${error ? 'text-bad' : 'text-muted'}`}>
          {message}
        </span>
      ) : null}
    </div>
  )
})
