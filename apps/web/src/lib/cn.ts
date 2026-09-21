import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Joins class names and lets a LATER one win over an earlier one of the same
 * kind. It is what every shadcn/ui component is written against, and it is not
 * decoration: the app's old pattern — `` `${BASE} ${className}` `` — does not
 * override anything. Two utilities of the same group have identical
 * specificity, so the winner is decided by the order Tailwind emits them in the
 * stylesheet, not by the order in the attribute. `bg-panel2 bg-panel` could
 * paint either one. `twMerge` drops the loser before it ever reaches the DOM.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
