export type CheckboxTone = 'accent' | 'danger'

/**
 * What the box looks like once it is checked. Two tones because the app checks
 * boxes for two different reasons: opting into something (sharing the audio) and
 * acknowledging something irreversible (erasing the account).
 *
 * Each tone declares its own border, like the button variants do: `border-line2`
 * and `border-accent` have the same specificity, so a base that set the border
 * would silently cancel the tone's, depending only on the order Tailwind emits.
 */
export const CHECKBOX_TONE_CLASSES: Record<CheckboxTone, string> = {
  accent:
    'border-line2 hover:border-accent focus-visible:ring-accent-soft data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-ink',
  danger:
    'border-line2 hover:border-bad focus-visible:ring-bad/25 data-[state=checked]:border-bad data-[state=checked]:bg-bad data-[state=checked]:text-bg',
}
