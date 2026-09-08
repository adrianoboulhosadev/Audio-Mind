import type { MindMapTone } from '@/lib/mind-map-layout'

/**
 * What each section of the map is called. The same two names the summary uses
 * above it on purpose: the map is that summary in another shape, and a third
 * wording would suggest it is saying something else.
 */
export const MIND_MAP_SECTION_TITLES: Record<MindMapTone, string> = {
  topic: 'Pontos principais',
  action: 'Próximos passos',
}

/**
 * The colour of each branch. It comes from the palette as a CSS variable and
 * reaches the SVG through `style`, not a Tailwind class: a colour that varies
 * with the DATA is exactly the case the config file calls out, and the export
 * below needs to be able to resolve it.
 */
export const MIND_MAP_TONE_COLORS: Record<MindMapTone, string> = {
  topic: 'var(--accent)',
  action: 'var(--good)',
}

/**
 * The palette variables copied onto the SVG before it is turned into a PNG.
 *
 * A serialized SVG loaded as an image is its OWN document: it never sees
 * globals.css, so every `var(--accent)` in it would resolve to nothing and the
 * export would come out unpainted. Reading the values off the live page and
 * setting them on the clone keeps the palette in one place instead of pasting
 * hex codes here.
 */
export const EXPORTED_PALETTE_VARS = [
  '--panel',
  '--panel2',
  '--ink',
  '--ink2',
  '--muted',
  '--line2',
  '--accent',
  '--accent-ink',
  '--good',
]
