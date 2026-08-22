import type { ReactNode } from 'react'

/**
 * Inline SVG rather than an icon library: this app needs five glyphs, and a
 * dependency for that costs more (bundle, upgrade surface) than the markup.
 */
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const ICONS: Record<string, ReactNode> = {
  library: (
    <svg {...base}>
      <path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M14 3v6h6" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  ),
  bell: (
    <svg {...base}>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7Z" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  ),
  user: (
    <svg {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  wave: (
    <svg {...base}>
      <path d="M3 12h2M7 8v8M11 4v16M15 8v8M19 11h2" />
    </svg>
  ),
  menu: (
    <svg {...base}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  close: (
    <svg {...base}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
}
