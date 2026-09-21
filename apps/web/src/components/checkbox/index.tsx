'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/lib/cn'
import { CHECKBOX_TONE_CLASSES, type CheckboxTone } from './data/checkbox-tones'

/**
 * shadcn/ui's `Checkbox` — Radix's button with `role="checkbox"` — in this app's
 * palette.
 *
 * It replaces `<input type="checkbox" className="accent-accent">`, and the
 * reason is not looks: `accent-color` is the ONE thing a native checkbox lets
 * you paint. The box, the tick, the border and the focus ring stay the
 * browser's, so the control that asks someone to confirm erasing their account
 * was drawn by Chromium and matched nothing around it. Here the tick is our
 * icon and every state comes from the palette.
 *
 * It is still a real form control: Radix renders a hidden native input, so
 * `name` is submitted and `required` is enforced.
 */
export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { tone?: CheckboxTone }
>(function Checkbox({ className, tone = 'accent', ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border bg-panel2 outline-none transition',
        'focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        CHECKBOX_TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check size={12} strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
