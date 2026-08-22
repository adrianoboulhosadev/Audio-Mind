export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'

/**
 * Each variant declares its OWN border. `border-0` and `border` have the same
 * specificity, so which one wins is decided by the order Tailwind emits them,
 * not by the order in the class string — a base with `border-0` silently
 * cancels a variant's border.
 */
export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border border-accent bg-accent text-accent-ink hover:brightness-110 disabled:hover:brightness-100',
  ghost: 'border border-line2 bg-transparent text-ink2 hover:bg-panel2 hover:text-ink',
  danger: 'border border-bad/60 bg-transparent text-bad hover:bg-bad/10',
  subtle: 'border border-transparent bg-panel2 text-ink2 hover:text-ink',
}

export const BUTTON_BASE_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap max-sm:whitespace-normal'
