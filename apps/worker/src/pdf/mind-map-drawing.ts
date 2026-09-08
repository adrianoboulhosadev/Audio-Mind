import {
  DEFAULT_MIND_MAP_GEOMETRY,
  type MindMap,
  type MindMapGeometry,
  type MindMapMeasure,
  type MindMapNode,
  type MindMapTone,
} from '@summary/adapters'

/**
 * The mind map, drawn INTO the document with pdfkit — vector, not a picture.
 *
 * The geometry is the same one the screen uses (@summary/adapters); what
 * changes here is the two things that are genuinely different on paper:
 *
 * - the boxes are measured with the REAL font (`widthOfString`) instead of an
 *   average glyph width, so nothing ends up a hair too wide for its box;
 * - it is a light document on white paper, not the app's dark panel.
 *
 * Vector matters beyond looks: the text stays selectable and searchable, and it
 * prints at the printer's resolution instead of at whatever a PNG was exported
 * with.
 */

const FONT = 'Helvetica'
const BOLD = 'Helvetica-Bold'

/** The document's palette. It is NOT the app's: that one is built for a dark
 * screen, and this is ink on white paper. */
export const PDF_COLORS = {
  ink: '#111827',
  ink2: '#1f2937',
  muted: '#6b7280',
  line: '#e5e7eb',
  panel: '#f8fafc',
  accent: '#2563eb',
  accentSoft: '#eff4ff',
  good: '#047857',
  goodSoft: '#ecfdf5',
}

const TONE: Record<MindMapTone, { stroke: string; soft: string }> = {
  topic: { stroke: PDF_COLORS.accent, soft: PDF_COLORS.accentSoft },
  action: { stroke: PDF_COLORS.good, soft: PDF_COLORS.goodSoft },
}

/**
 * Points, not pixels, and sized for an A4 text column: root + section + leaf
 * with two gaps has to land inside 483pt, so the boxes are narrower and the
 * type smaller than on screen. It fits because the leaves draw the bullet's
 * LABEL — the explanation is written out in full further down the page.
 */
export const PDF_MIND_MAP_GEOMETRY: MindMapGeometry = {
  ...DEFAULT_MIND_MAP_GEOMETRY,
  lineHeight: 10.5,
  padX: 7,
  padY: 6,
  leafGap: 7,
  groupGap: 16,
  levelGap: 26,
  margin: 4,
  wide: {
    root: { width: 132, fontSize: 10, maxLines: 4, bold: true },
    branch: { width: 116, fontSize: 8.5, maxLines: 2, bold: true },
    leaf: { width: 165, fontSize: 8, maxLines: 3, bold: false },
  },
}

/**
 * Wrapping measured against the actual font, which pdfkit can do and a browser
 * cannot do cheaply. `lineBreak: false` everywhere else in the drawing depends
 * on this being right: pdfkit would otherwise re-wrap inside its own box and
 * push text out of the rectangle we drew.
 */
export function pdfMeasure(document: PDFKit.PDFDocument): MindMapMeasure {
  return (text, spec) => {
    document.font(spec.bold ? BOLD : FONT).fontSize(spec.fontSize)
    const limit = spec.width - PDF_MIND_MAP_GEOMETRY.padX * 2
    const fits = (value: string) => document.widthOfString(value) <= limit

    const lines: string[] = []
    let current = ''

    for (const word of text.trim().split(/\s+/).filter(Boolean)) {
      let rest = word
      // A single word wider than the box is broken by force — pdfkit does not
      // clip, so it would simply run over the neighbouring node.
      while (!fits(rest)) {
        let cut = rest.length - 1
        while (cut > 1 && !fits(rest.slice(0, cut))) cut--
        if (cut <= 1) break
        if (current) {
          lines.push(current)
          current = ''
        }
        lines.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }

      const candidate = current ? `${current} ${rest}` : rest
      if (fits(candidate)) {
        current = candidate
      } else {
        if (current) lines.push(current)
        current = rest
      }
    }
    if (current) lines.push(current)

    if (lines.length === 0) return ['']
    if (lines.length <= spec.maxLines) return lines

    const kept = lines.slice(0, spec.maxLines)
    let last = kept[spec.maxLines - 1]
    while (last.length > 1 && !fits(`${last}…`)) last = last.slice(0, -1)
    kept[spec.maxLines - 1] = `${last.trimEnd()}…`
    return kept
  }
}

interface DrawOptions {
  x: number
  y: number
  /** The text column. A map wider than this is scaled to fit — the alternative
   * is a drawing running off the side of the paper. */
  maxWidth: number
  maxHeight: number
}

/** Draws the map and answers how much vertical space it took. */
export function drawMindMap(
  document: PDFKit.PDFDocument,
  map: MindMap,
  { x, y, maxWidth, maxHeight }: DrawOptions,
): number {
  const scale = Math.min(1, maxWidth / map.width, maxHeight / map.height)

  document.save()
  document.translate(x, y)
  if (scale < 1) document.scale(scale, scale, { origin: [0, 0] })

  map.edges.forEach((edge) => {
    const { stroke } = TONE[edge.tone]
    edge.segments.forEach((segment) => {
      document.moveTo(segment.from[0], segment.from[1])
      if (segment.kind === 'line') {
        document.lineTo(segment.to[0], segment.to[1])
      } else {
        document.bezierCurveTo(
          segment.control[0][0],
          segment.control[0][1],
          segment.control[1][0],
          segment.control[1][1],
          segment.to[0],
          segment.to[1],
        )
      }
      document.lineWidth(0.8).strokeColor(stroke).strokeOpacity(0.55).stroke()
    })
  })
  document.strokeOpacity(1)

  map.nodes.forEach((node) => drawNode(document, node))

  document.restore()
  return map.height * scale
}

function drawNode(document: PDFKit.PDFDocument, node: MindMapNode): void {
  const tone = node.tone ? TONE[node.tone] : TONE.topic
  const isRoot = node.kind === 'root'
  const isBranch = node.kind === 'branch'

  document.roundedRect(node.x, node.y, node.width, node.height, 5)
  if (isRoot) {
    document.fillAndStroke(tone.stroke, tone.stroke)
  } else if (isBranch) {
    document.lineWidth(0.8).fillAndStroke(tone.soft, tone.stroke)
  } else {
    document.lineWidth(0.6).fillAndStroke(PDF_COLORS.panel, PDF_COLORS.line)
  }

  document
    .font(node.bold ? BOLD : FONT)
    .fontSize(node.fontSize)
    .fillColor(isRoot ? '#ffffff' : isBranch ? tone.stroke : PDF_COLORS.ink2)

  node.lines.forEach((line, index) => {
    // `textY` is a BASELINE (that is what SVG wants); pdfkit places the top of
    // the line, so the ascender comes back off.
    document.text(line, node.textX, node.textY - node.fontSize + index * node.lineHeight, {
      lineBreak: false,
      width: node.width,
    })
  })
}
