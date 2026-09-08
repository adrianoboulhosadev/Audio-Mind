import type { MindMapTone } from '@summary/adapters'

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
