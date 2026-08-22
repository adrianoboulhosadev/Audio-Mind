import type { Config } from 'tailwindcss'

/**
 * The palette lives in globals.css as CSS variables and is mapped here — so
 * nothing in the app ever writes a raw Tailwind color (`slate-800`, `red-500`).
 * A color that comes from DATA (a status dot) uses `style={{}}`, because
 * Tailwind cannot generate a class it has not seen.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        ink: 'var(--ink)',
        ink2: 'var(--ink2)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        line2: 'var(--line2)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-ink': 'var(--accent-ink)',
        good: 'var(--good)',
        warn: 'var(--warn)',
        bad: 'var(--bad)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.35), 0 8px 24px -12px rgba(0,0,0,.6)',
        pop: '0 12px 40px -12px rgba(0,0,0,.8)',
      },
      keyframes: {
        pulseRing: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(91,140,255,.45)' },
          '50%': { boxShadow: '0 0 0 12px rgba(91,140,255,0)' },
        },
        sweep: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(300%)' } },
        // The bars of the little equalizer that says "processing".
        bounce1: { '0%,100%': { transform: 'scaleY(.35)' }, '50%': { transform: 'scaleY(1)' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        pulseRing: 'pulseRing 1.8s ease-out infinite',
        sweep: 'sweep 1.6s linear infinite',
        bounce1: 'bounce1 1s ease-in-out infinite',
        fadeUp: 'fadeUp .25s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
