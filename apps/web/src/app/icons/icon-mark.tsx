import { ImageResponse } from 'next/og'

type IconMarkOptions = {
  size: number
  maskable?: boolean
}

/** The five bars of the loading equalizer (components/loading), frozen at the
 * heights they pass through mid-animation. Same proportions, so the installed
 * app's icon is recognisably the thing the app shows while it works. */
const BAR_HEIGHTS = [0.42, 0.78, 0.58, 1, 0.34]

/**
 * Renders the equalizer mark as a PNG at whatever size an icon slot needs —
 * one generator instead of five hand-drawn near-identical files, which is what
 * keeps them from drifting apart when the mark changes.
 *
 * Maskable gets a smaller glyph on the same full-bleed background: the OS
 * applies its own shape mask (circle, squircle, rounded square) over the whole
 * square, so only the centre safe zone is guaranteed to survive the crop.
 */
export function iconMarkResponse({ size, maskable = false }: IconMarkOptions) {
  // Not the CSS variables: this renders outside the browser, where the
  // stylesheet does not exist. Kept equal to --bg and --accent by hand.
  const background = '#0a0e15'
  const accent = '#5b8cff'

  const markHeight = size * (maskable ? 0.4 : 0.56)
  const barWidth = markHeight * 0.17
  const gap = barWidth * 0.62

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', height: markHeight, gap }}>
          {BAR_HEIGHTS.map((ratio, index) => (
            <div
              key={index}
              style={{
                width: barWidth,
                height: markHeight * ratio,
                background: accent,
                borderRadius: barWidth,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: size, height: size },
  )
}
