/**
 * The geometry of the mind map, as a pure function: text in, boxes and curves
 * out. No React, no DOM and no pdfkit — which is what lets the SAME map be an
 * SVG on the screen and vector drawing inside the PDF, and what makes the hard
 * part (wrapping, stacking, not overlapping) testable.
 *
 * It lives in `adapters` and not in `core` because it is presentation, not
 * domain: the summary does not know it can be drawn. It is here rather than
 * copied into each app — the rule that puts a driven adapter in the app that
 * consumes it is about INFRASTRUCTURE (a repository, a queue), and two copies of
 * a layout algorithm would drift until the picture on the screen and the one in
 * the document stopped agreeing.
 *
 * The map is DERIVED from the summary itself — headline in the middle, one
 * branch per section, one leaf per bullet. There is no second model call behind
 * it: the two would be free to disagree about the same audio, and a map
 * contradicting the text next to it is worse than no map.
 *
 * Neither target wraps text on its own, so every label is broken into lines
 * before it is placed. HOW they are measured differs and is INJECTED: the
 * browser gets an estimate in characters (it has no cheap way to measure a
 * glyph), while the PDF measures the real font, which is why its boxes fit
 * exactly.
 */

export type MindMapTone = 'topic' | 'action'
export type MindMapNodeKind = 'root' | 'branch' | 'leaf'

/** Two-sided when there is room for it, a single stacked column when there is
 * not. A phone gets the stack: the mirrored layout is 700px wide before it
 * starts, and scaled down to fit it becomes 4px type. */
export type MindMapOrientation = 'wide' | 'narrow'

/** The box a label has to fit into. `bold` is here because the measurer needs
 * it — a bold face is measurably wider, and one number for both is what makes a
 * section title touch the edge of its own box. */
export interface MindMapBoxSpec {
  width: number
  fontSize: number
  maxLines: number
  bold: boolean
}

/** Breaks a label into the lines that will be drawn, already elided if it did
 * not fit. Injected so each target measures with what it actually has. */
export type MindMapMeasure = (text: string, spec: MindMapBoxSpec) => string[]

export interface MindMapGeometry {
  lineHeight: number
  padX: number
  padY: number
  leafGap: number
  /** Between one section and the next, so the two do not read as one list. */
  groupGap: number
  /** Horizontal breathing room between levels (wide) / vertical (narrow). */
  levelGap: number
  margin: number
  wide: { root: MindMapBoxSpec; branch: MindMapBoxSpec; leaf: MindMapBoxSpec }
  narrow: {
    root: MindMapBoxSpec
    branch: MindMapBoxSpec
    leaf: MindMapBoxSpec
    /** How far a leaf sits from the section it belongs to. The spine is drawn
     * inside this gutter. */
    indent: number
    groupGap: number
    rootGap: number
  }
}

export interface MindMapNode {
  id: string
  kind: MindMapNodeKind
  /** Absent on the root, which belongs to no section. */
  tone?: MindMapTone
  /** The whole item this node stands for — the tooltip, and what the document
   * writes out in full further down. */
  text: string
  /** The label as it is DRAWN: wrapped, and elided when it did not fit. */
  lines: string[]
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  bold: boolean
  /** Where the label starts and how far apart its lines sit. Computed here so
   * the caller never has to know the padding — two copies of the same number is
   * how a box and the text inside it drift apart. */
  textX: number
  /** Baseline of the FIRST line (SVG) / top of it (pdfkit adds the ascender). */
  textY: number
  lineHeight: number
}

export interface MindMapEdge {
  id: string
  path: string
  tone: MindMapTone
  /** The same curve as `path`, as points — pdfkit draws with calls, not with a
   * path string, and parsing back what this file just wrote would be silly. */
  segments: MindMapSegment[]
}

/** A straight line or a cubic, in the order they are drawn. */
export type MindMapSegment =
  | { kind: 'line'; from: [number, number]; to: [number, number] }
  | { kind: 'curve'; from: [number, number]; control: [[number, number], [number, number]]; to: [number, number] }

export interface MindMap {
  width: number
  height: number
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

export interface MindMapGroup {
  tone: MindMapTone
  /** What the section is called ("Pontos principais") — copy, so it comes from
   * the caller instead of being written here. */
  title: string
  items: string[]
}

export interface MindMapInput {
  headline: string
  groups: MindMapGroup[]
}

export interface MindMapOptions {
  orientation: MindMapOrientation
  /** Defaults to the screen's: pixels, and lines estimated in characters. */
  geometry?: MindMapGeometry
  measure?: MindMapMeasure
}

/** Average glyph width as a fraction of the font size, for a sans face. */
const CHAR_RATIO = 0.57
const BOLD_CHAR_RATIO = 0.63

export const DEFAULT_MIND_MAP_GEOMETRY: MindMapGeometry = {
  lineHeight: 15,
  padX: 12,
  padY: 9,
  leafGap: 9,
  groupGap: 24,
  levelGap: 44,
  margin: 18,
  wide: {
    root: { width: 200, fontSize: 14, maxLines: 4, bold: true },
    branch: { width: 156, fontSize: 12, maxLines: 2, bold: true },
    leaf: { width: 216, fontSize: 12, maxLines: 4, bold: false },
  },
  narrow: {
    root: { width: 258, fontSize: 14, maxLines: 4, bold: true },
    branch: { width: 258, fontSize: 12, maxLines: 2, bold: true },
    leaf: { width: 236, fontSize: 12, maxLines: 6, bold: false },
    indent: 22,
    groupGap: 20,
    rootGap: 18,
  },
}

/** The prompt asks for 2 to 5 words; past this it is a sentence, not a label. */
const MAX_LABEL_WORDS = 6

/**
 * A bullet written as "Rótulo: explicação" split in two.
 *
 * The summary prompt asks for exactly that shape, and it is what lets one piece
 * of text serve both jobs: the map draws the LABEL (a mind map with sentences in
 * its nodes is not a mind map) and the document writes the whole thing out.
 *
 * Tolerant on purpose — a model that ignores the shape, or a summary written
 * before this existed, simply has no label, and everything falls back to the
 * full text.
 */
export function splitBulletLabel(text: string): { label: string | null; detail: string } {
  const trimmed = text.trim()
  // A label is at the very START, opens with a capital (or a number, for "NR15"),
  // carries no sentence punctuation, and is followed by real content. The
  // capital and the word count are what tell a LABEL from a colon in the middle
  // of a sentence — "o time decidiu o seguinte: esperar o fechamento" is not a
  // label, and drawing it as one puts half a sentence in a node of the map.
  const match = /^([\p{Lu}\p{N}][^:—–.!?]{1,58})\s*[:—–]\s+(\S[\s\S]*)$/u.exec(trimmed)
  if (!match) return { label: null, detail: trimmed }

  const label = match[1].trim()
  if (label.split(/\s+/).length > MAX_LABEL_WORDS) return { label: null, detail: trimmed }

  return { label, detail: match[2].trim() }
}

/**
 * Breaks a label into the lines that fit `maxChars`, eliding the rest.
 *
 * A word longer than a whole line is broken by force: left alone it would run
 * past the box, and neither SVG nor pdfkit clips anything by default — the text
 * would simply overlap whatever is next to it.
 */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    let rest = word
    while (rest.length > maxChars) {
      if (current) {
        lines.push(current)
        current = ''
      }
      lines.push(rest.slice(0, maxChars))
      rest = rest.slice(maxChars)
    }

    const candidate = current ? `${current} ${rest}` : rest
    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = rest
    }
  }
  if (current) lines.push(current)

  if (lines.length === 0) return ['']
  if (lines.length <= maxLines) return lines

  const kept = lines.slice(0, maxLines)
  const last = kept[maxLines - 1]
  // Room for the ellipsis has to be taken OUT of the line, not added to it.
  kept[maxLines - 1] = `${last.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`
  return kept
}

/** The default measurer: characters against an average glyph width. Good enough
 * for the screen, where the boxes are generous and the whole text is one hover
 * away. */
export const estimateLines: MindMapMeasure = (text, spec) => {
  const ratio = spec.bold ? BOLD_CHAR_RATIO : CHAR_RATIO
  const padding = DEFAULT_MIND_MAP_GEOMETRY.padX * 2
  const maxChars = Math.max(8, Math.floor((spec.width - padding) / (spec.fontSize * ratio)))
  return wrapText(text, maxChars, spec.maxLines)
}

interface Context {
  geometry: MindMapGeometry
  measure: MindMapMeasure
}

function buildNode(
  context: Context,
  id: string,
  kind: MindMapNodeKind,
  /** What the box says. */
  label: string,
  /** What the box STANDS FOR — the whole bullet, when the label is its title. */
  text: string,
  spec: MindMapBoxSpec,
  tone?: MindMapTone,
): MindMapNode {
  const { geometry } = context
  const lines = context.measure(label, spec)

  return {
    id,
    kind,
    tone,
    text,
    lines,
    x: 0,
    y: 0,
    width: spec.width,
    height: geometry.padY * 2 + lines.length * geometry.lineHeight,
    fontSize: spec.fontSize,
    bold: spec.bold,
    textX: geometry.padX,
    textY: geometry.padY + spec.fontSize,
    lineHeight: geometry.lineHeight,
  }
}

/** A cubic between two points, flat at both ends — the same shape whether the
 * child is to the right of the parent or to the left. */
function curve(x1: number, y1: number, x2: number, y2: number): MindMapSegment {
  const handle = (x2 - x1) / 2
  return {
    kind: 'curve',
    from: [x1, y1],
    control: [
      [x1 + handle, y1],
      [x2 - handle, y2],
    ],
    to: [x2, y2],
  }
}

function line(x1: number, y1: number, x2: number, y2: number): MindMapSegment {
  return { kind: 'line', from: [x1, y1], to: [x2, y2] }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function centerY(node: MindMapNode): number {
  return node.y + node.height / 2
}

/**
 * The wide layout: headline on the left, its sections branching to the right.
 *
 * Left to right and not mirrored around the centre. A mirrored map is the
 * prettier picture, but it needs about 1200px before it starts — and every
 * surface that shows this one is a reading column (768px on screen, an A4 text
 * block in the document), so it would have to be shrunk until the type was
 * unreadable, or scrolled sideways.
 *
 * Not a radial either: a radial has to rotate its labels or place them around a
 * circle. Stacked boxes keep every line horizontal and never overlap, which is
 * worth more here than the shape of a textbook mind map.
 */
function buildWide(context: Context, input: MindMapInput): MindMap {
  const { geometry } = context
  const { wide } = geometry
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []

  const root = buildNode(context, 'root', 'root', input.headline, input.headline, wide.root)
  const branchX = wide.root.width + geometry.levelGap
  const leafX = branchX + wide.branch.width + geometry.levelGap

  const branches: MindMapNode[] = []
  let cursor = 0

  input.groups.forEach((group, groupIndex) => {
    const branch = buildNode(context, `branch-${groupIndex}`, 'branch', group.title, group.title, wide.branch, group.tone)
    const leaves = group.items.map((item, itemIndex) =>
      buildNode(context, `leaf-${groupIndex}-${itemIndex}`, 'leaf', labelOf(item), item, wide.leaf, group.tone),
    )

    const top = cursor
    leaves.forEach((leaf) => {
      leaf.x = leafX
      leaf.y = cursor
      cursor += leaf.height + geometry.leafGap
    })
    const bottom = cursor - geometry.leafGap

    // The section sits at the middle of what it holds, so the line into it
    // points at the group and not at its first item.
    branch.x = branchX
    branch.y = (top + bottom) / 2 - branch.height / 2
    branches.push(branch)
    nodes.push(branch, ...leaves)

    leaves.forEach((leaf) => {
      edges.push(
        edge(`edge-${branch.id}-${leaf.id}`, group.tone, [
          curve(branch.x + branch.width, centerY(branch), leaf.x, centerY(leaf)),
        ]),
      )
    })

    cursor = bottom + geometry.groupGap
  })

  // The headline is centred on the whole tree, not on the first section.
  const treeHeight = cursor - geometry.groupGap
  root.x = 0
  root.y = Math.max(0, (treeHeight - root.height) / 2)
  nodes.unshift(root)

  branches.forEach((branch, groupIndex) => {
    edges.unshift(
      edge(`edge-root-${groupIndex}`, input.groups[groupIndex].tone, [
        curve(root.x + root.width, centerY(root), branch.x, centerY(branch)),
      ]),
    )
  })

  return normalize(context, nodes, edges)
}

/**
 * The stacked layout, for a phone: headline on top, each section below it, its
 * bullets indented under a spine.
 *
 * It is the same tree — only the direction of "below" changed. The alternative
 * was scrolling the wide map sideways, which on a touch screen fights the page
 * scroll for the same gesture.
 */
function buildNarrow(context: Context, input: MindMapInput): MindMap {
  const { geometry } = context
  const { narrow } = geometry
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []
  const spineX = narrow.indent / 2

  const root = buildNode(context, 'root', 'root', input.headline, input.headline, narrow.root)
  nodes.push(root)
  let cursor = root.height + narrow.rootGap
  // Where the line down the gutter got to. Each section continues it from
  // there, so the tree reads as one line instead of floating segments.
  let spineFrom = root.height

  input.groups.forEach((group, groupIndex) => {
    const branch = buildNode(
      context,
      `branch-${groupIndex}`,
      'branch',
      group.title,
      group.title,
      narrow.branch,
      group.tone,
    )
    branch.y = cursor
    nodes.push(branch)
    cursor += branch.height

    // Straight down the gutter: a curve between two boxes of the same width
    // stacked on top of each other only wobbles.
    edges.push(edge(`edge-root-${groupIndex}`, group.tone, [line(spineX, spineFrom, spineX, branch.y)]))

    const leaves = group.items.map((item, itemIndex) =>
      buildNode(context, `leaf-${groupIndex}-${itemIndex}`, 'leaf', labelOf(item), item, narrow.leaf, group.tone),
    )

    cursor += geometry.leafGap
    leaves.forEach((leaf) => {
      leaf.x = narrow.indent
      leaf.y = cursor
      cursor += leaf.height + geometry.leafGap
      edges.push(
        edge(`edge-${branch.id}-${leaf.id}`, group.tone, [
          line(spineX, centerY(leaf), leaf.x, centerY(leaf)),
        ]),
      )
    })
    nodes.push(...leaves)

    if (leaves.length > 0) {
      // One spine per section, ending at the LAST leaf's line instead of its
      // bottom, so the vertical does not stick out past the tree.
      spineFrom = centerY(leaves[leaves.length - 1])
      edges.push(
        edge(`edge-spine-${groupIndex}`, group.tone, [
          line(spineX, branch.y + branch.height, spineX, spineFrom),
        ]),
      )
    } else {
      spineFrom = branch.y + branch.height
    }

    cursor += narrow.groupGap - geometry.leafGap
  })

  return normalize(context, nodes, edges)
}

/** The map shows the bullet's LABEL when it has one: a node holding three
 * sentences is a paragraph in a box, not a branch of a mind map. */
function labelOf(item: string): string {
  return splitBulletLabel(item).label ?? item
}

function edge(id: string, tone: MindMapTone, segments: MindMapSegment[]): MindMapEdge {
  return { id, tone, segments, path: '' }
}

/**
 * Adds the margin, reports the box the drawing needs, and writes each edge's
 * SVG path. Both layouts are built from an origin at the top left, so this only
 * has to make room around them.
 */
function normalize(context: Context, nodes: MindMapNode[], edges: MindMapEdge[]): MindMap {
  const { margin } = context.geometry
  const offsetX = margin - Math.min(...nodes.map((node) => node.x))
  const offsetY = margin - Math.min(...nodes.map((node) => node.y))

  const moved = nodes.map((node) => ({
    ...node,
    x: round(node.x + offsetX),
    y: round(node.y + offsetY),
    textX: round(node.x + offsetX + node.textX),
    textY: round(node.y + offsetY + node.textY),
  }))

  const movedEdges = edges.map((item) => {
    const segments = item.segments.map((segment) => shift(segment, offsetX, offsetY))
    return { ...item, segments, path: toPath(segments) }
  })

  return {
    width: Math.round(Math.max(...moved.map((node) => node.x + node.width)) + margin),
    height: Math.round(Math.max(...moved.map((node) => node.y + node.height)) + margin),
    nodes: moved,
    edges: movedEdges,
  }
}

function shift(segment: MindMapSegment, offsetX: number, offsetY: number): MindMapSegment {
  const move = ([x, y]: [number, number]): [number, number] => [round(x + offsetX), round(y + offsetY)]

  return segment.kind === 'line'
    ? { kind: 'line', from: move(segment.from), to: move(segment.to) }
    : {
        kind: 'curve',
        from: move(segment.from),
        control: [move(segment.control[0]), move(segment.control[1])],
        to: move(segment.to),
      }
}

/** The same segments as an SVG `d`, for the browser. */
function toPath(segments: MindMapSegment[]): string {
  return segments
    .map((segment) =>
      segment.kind === 'line'
        ? `M ${segment.from[0]} ${segment.from[1]} L ${segment.to[0]} ${segment.to[1]}`
        : `M ${segment.from[0]} ${segment.from[1]} C ${segment.control[0][0]} ${segment.control[0][1]}, ${segment.control[1][0]} ${segment.control[1][1]}, ${segment.to[0]} ${segment.to[1]}`,
    )
    .join(' ')
}

/**
 * The whole map. Returns null when there is nothing to branch into: a lone
 * headline in a box is not a mind map, and drawing one would make an empty
 * summary look like a broken feature.
 */
export function buildMindMap(input: MindMapInput, options: MindMapOptions): MindMap | null {
  const groups = input.groups.filter((group) => group.items.length > 0)
  if (!input.headline.trim() || groups.length === 0) return null

  const context: Context = {
    geometry: options.geometry ?? DEFAULT_MIND_MAP_GEOMETRY,
    measure: options.measure ?? estimateLines,
  }
  const usable: MindMapInput = { headline: input.headline, groups }

  return options.orientation === 'wide' ? buildWide(context, usable) : buildNarrow(context, usable)
}
