'use client'

import { useId, type ReactNode } from 'react'
import { Label } from '@/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select'

interface SelectFieldProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  hint?: ReactNode
  disabled?: boolean
  placeholder?: string
  /** Submitted by the hidden native input Radix renders, when in a form. */
  name?: string
  className?: string
}

/**
 * The labelled dropdown every form uses — the same box as `Field`, so a form
 * mixing the two lines up.
 *
 * It is a Radix listbox now, not a `<select>`, which changes one thing at the
 * call site: the value arrives as a STRING through `onValueChange`, not as a
 * change event to be read off `event.target.value`. That is also why it is no
 * longer a forwardRef — the element behind it is a button, and the way to hand
 * this to react-hook-form is `Controller`, not `register`. Nothing in the app
 * registers one today.
 */
export function SelectField({
  label,
  options,
  value,
  onValueChange,
  hint,
  disabled,
  placeholder,
  name,
  className,
}: SelectFieldProps) {
  const triggerId = useId()

  return (
    <div className="block">
      <Label htmlFor={triggerId} className="mb-1.5">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
        {/* `aria-label` is not duplicating the visible label: the trigger is a
            BUTTON, and a `<label for>` does not name a button — without this its
            accessible name would be whichever option is currently picked. The
            `htmlFor` above still earns its keep, since it is what makes clicking
            the words focus the control. */}
        <SelectTrigger id={triggerId} className={className} aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </div>
  )
}
