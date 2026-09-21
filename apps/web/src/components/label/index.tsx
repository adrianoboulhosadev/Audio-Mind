'use client'

import * as LabelPrimitive from '@radix-ui/react-label'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * shadcn/ui's `Label`, which is Radix's — and Radix's exists for one behaviour a
 * plain `<label>` does not have: clicking it focuses the control even when the
 * control is not a native input. That is what keeps the label of a `Select`
 * working, since the thing it points at is a button, not a `<select>`.
 */
export const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'block text-sm text-ink2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
})
