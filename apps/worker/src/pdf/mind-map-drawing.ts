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
 * - the labels are measured with the REAL font (`widthOfString`) instead of an
 *   average glyph width, so every one of them sits exactly on its twig;
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
 * Points, not pixels, and sized for an A4 text column: the map reaches out to
 * BOTH sides of the headline, so the budget is
 * `2 × (distance + label)` and it has to land inside 483pt. It fits because a
 * leaf draws the bullet's LABEL — two to five words — and not the sentence,
 * which is written out in full further down the page.
 */
export const PDF_MIND_MAP_GEOMETRY: MindMapGeometry = {
  ...DEFAULT_MIND_MAP_GEOMETRY,
  lineHeight: 10.5,
  padX: 8,
  padY: 7,
  leafGap: 15,
  groupGap: 14,
  margin: 6,
  radial: {
    root: { width: 150, fontSize: 11, maxLines: 4, bold: true },
    leaf: { width: 112, fontSize: 8.5, maxLines: 3, bold: false },
    innerRadius: 92,
    arc: 40,
    ribbonRoot: 6.5,
    ribbonLeaf: 1.2,
    twigHeight: 1.2,
  },
}

/**
 * Wrapping and width measured against the actual font, which pdfkit can do and
 * a browser cannot do cheaply. `lineBreak: false` everywhere in the drawing
 * depends on this being right: pdfkit would otherwise re-wrap inside its own box
 * and push text out of where the layout put it.
 */
export function pdfMeasure(document: PDFKit.PDFDocument): MindMapMeasure {
  return (text, spec) => {
    document.font(spec.bold ? BOLD : FONT).fontSize(spec.fontSize)
    const fits = (value: string) => document.widthOfString(value) <= spec.width

    const lines: string[] = []
    let current = ''

    for (const word of text.trim().split(/\s+/).filter(Boolean)) {
      let rest = word
      // A single word wider than the box is broken by force — pdfkit does not
      // clip, so it would simply run over the neighbouring label.
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

    if (lines.length === 0) return { lines: [''], width: 0 }

    if (lines.length > spec.maxLines) {
      const kept = lines.slice(0, spec.maxLines)
      let last = kept[spec.maxLines - 1]
      while (last.length > 1 && !fits(`${last}…`)) last = last.slice(0, -1)
      kept[spec.maxLines - 1] = `${last.trimEnd()}…`
      lines.length = 0
      lines.push(...kept)
    }

    const width = lines.reduce((widest, line) => Math.max(widest, document.widthOfString(line)), 0)
    return { lines, width: Math.min(spec.width, width) }
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
      if (segment.kind === 'ribbon') {
        // Filled, not stroked: the branch tapers, so its width is an OUTLINE.
        document
          .moveTo(segment.out.from[0], segment.out.from[1])
          .bezierCurveTo(
            segment.out.control[0][0],
            segment.out.control[0][1],
            segment.out.control[1][0],
            segment.out.control[1][1],
            segment.out.to[0],
            segment.out.to[1],
          )
          .lineTo(segment.tip[0], segment.tip[1])
          .bezierCurveTo(
            segment.back.control[0][0],
            segment.back.control[0][1],
            segment.back.control[1][0],
            segment.back.control[1][1],
            segment.back.to[0],
            segment.back.to[1],
          )
          .closePath()
          .fillOpacity(0.45)
          .fill(stroke)
          .fillOpacity(1)
        return
      }

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
      document.lineWidth(1).strokeColor(stroke).strokeOpacity(0.85).stroke()
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

  // Only the middle (and the section header of the stacked layout) is a box: a
  // rectangle around every label is what made the map read as an org chart.
  if (isRoot || isBranch) {
    document.roundedRect(node.x, node.y, node.width, node.height, isRoot ? 9 : 5)
    if (isRoot) {
      document.fillAndStroke(tone.stroke, tone.stroke)
    } else {
      document.lineWidth(0.8).fillAndStroke(tone.soft, tone.stroke)
    }
  }

  document
    .font(node.bold ? BOLD : FONT)
    .fontSize(node.fontSize)
    .fillColor(isRoot ? '#ffffff' : isBranch ? tone.stroke : PDF_COLORS.ink)

  node.lines.forEach((line, index) => {
    // `textY` is a BASELINE (that is what SVG wants); pdfkit places the top of
    // the line, so the ascender comes back off.
    document.text(line, node.x, node.textY - node.fontSize + index * node.lineHeight, {
      lineBreak: false,
      width: node.width,
      align: node.align === 'center' ? 'center' : node.align === 'right' ? 'right' : 'left',
    })
  })
}
