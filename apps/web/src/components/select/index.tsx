'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * shadcn/ui's `Select`, which is Radix's listbox, painted with this app's
 * palette.
 *
 * A native `<select>` cannot be styled where it matters: the OPEN list is drawn
 * by the operating system, so on a dark screen the one surface the palette
 * never reached was the menu itself — white on Windows, a grey sheet on iOS.
 * This one is our markup all the way down, and it keeps what the native control
 * got right for free: typeahead, Home/End, arrow keys, Escape to dismiss, focus
 * returning to the trigger, and the list staying on screen near the edges.
 *
 * The parts are exported separately, like shadcn does, so a screen can compose
 * an unusual one. The labelled, hinted box that every form actually uses is
 * `SelectField`, which is built out of these.
 */
export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(function SelectTrigger({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-lg border border-line2 bg-panel2 px-3 py-2 text-sm text-ink outline-none transition',
        'data-[placeholder]:text-muted',
        'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {/* min-w-0 so a long option truncates instead of stretching the trigger
          past the column it sits in — the same rule the rest of the app follows
          for a flex child that does not wrap. */}
      <span className="min-w-0 truncate text-left">{children}</span>
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={15} aria-hidden className="shrink-0 text-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(function SelectContent({ className, children, position = 'popper', ...props }, ref) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={6}
        className={cn(
          'relative z-50 max-h-64 overflow-hidden rounded-lg border border-line2 bg-panel text-ink shadow-pop',
          'data-[state=open]:animate-fadeUp',
          // The menu matches the trigger's width instead of hugging its longest
          // option, so opening it does not shift the layout under the pointer.
          position === 'popper' && 'w-[var(--radix-select-trigger-width)]',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-muted">
          <ChevronUp size={14} aria-hidden />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-muted">
          <ChevronDown size={14} aria-hidden />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2 pr-8 text-sm text-ink2 outline-none transition',
        // Radix marks the item under the pointer AND the one the keyboard is on
        // with the same attribute, which is why there is no separate hover rule:
        // one highlight, wherever the person is driving from.
        'data-[highlighted]:bg-panel2 data-[highlighted]:text-ink',
        'data-[state=checked]:text-ink',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center text-accent">
        <Check size={14} aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
})
