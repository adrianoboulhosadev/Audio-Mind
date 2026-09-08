/**
 * The geometry of the mind map, as a pure function: text in, shapes out. No
 * React, no DOM and no pdfkit — which is what lets the SAME map be an SVG on the
 * screen and vector drawing inside the PDF, and what makes the hard part
 * (wrapping, fanning, not overlapping) testable.
 *
 * It lives in `adapters` and not in `core` because it is presentation, not
 * domain: the summary does not know it can be drawn. It is here rather than
 * copied into each app — the rule that puts a driven adapter in the app that
 * consumes it is about INFRASTRUCTURE (a repository, a queue), and two copies of
 * a layout algorithm would drift until the picture on the screen and the one in
 * the document stopped agreeing.
 *
 * The map is DERIVED from the summary itself — headline in the middle, one leaf
 * per bullet, coloured by the section it came from. There is no second model
 * call behind it: the two would be free to disagree about the same audio, and a
 * map contradicting the text next to it is worse than no map.
 *
 * Neither target wraps or measures text on its own, so both come from the
 * INJECTED measurer: the browser estimates against an average glyph width (it
 * has no cheap way to measure one), while the PDF asks the font. That is why the
 * document's labels sit exactly on their twigs and the screen's are close.
 */

export type MindMapTone = 'topic' | 'action'
export type MindMapNodeKind = 'root' | 'branch' | 'leaf'

/**
 * `radial` is the mind map proper — the headline in the middle, leaves fanning
 * out to both sides on curved branches. `narrow` is the stacked, indented tree a
 * phone gets: the radial one needs both sides of a centre to mean anything, and
 * 390px has room for one.
 */
export type MindMapOrientation = 'radial' | 'narrow'

/** The box a label has to fit into. `bold` is here because the measurer needs
 * it — a bold face is measurably wider, and one number for both is what makes a
 * section title touch the edge of its own box. */
export interface MindMapBoxSpec {
  width: number
  fontSize: number
  maxLines: number
  bold: boolean
}

/** What the measurer answers: the lines as they will be DRAWN (already elided)
 * and how wide the widest one is. The width is what lets a label hang off the
 * left side of the map without the layout guessing where it ends. */
export interface MeasuredLabel {
  lines: string[]
  width: number
}

export type MindMapMeasure = (text: string, spec: MindMapBoxSpec) => MeasuredLabel

export interface MindMapGeometry {
  lineHeight: number
  padX: number
  padY: number
  leafGap: number
  /** Between one section's fan and the next, when both are on the same side. */
  groupGap: number
  margin: number
  radial: {
    root: MindMapBoxSpec
    leaf: MindMapBoxSpec
    /** How far from the centre the CLOSEST leaves sit (the ends of the fan). */
    innerRadius: number
    /** How much further the middle of a fan is pushed out. This is the arc: with
     * zero the leaves line up in a column and the map stops looking radial. */
    arc: number
    /** The branch is a tapered ribbon: thick where it leaves the centre, thin
     * where it meets the twig. */
    ribbonRoot: number
    ribbonLeaf: number
    /** The line the label sits on. */
    twigHeight: number
  }
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
  /** Which way the lines are set inside the box. A leaf on the LEFT of the map
   * reads as part of its branch only when it is ragged-left. */
  align: 'left' | 'right' | 'center'
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
  tone: MindMapTone
  /** The same shape as `path`, as points — pdfkit draws with calls, not with a
   * path string, and parsing back what this file just wrote would be silly. */
  segments: MindMapSegment[]
  /** The SVG `d`, for the browser. */
  path: string
  /** A ribbon is FILLED, a line or a curve is stroked. */
  filled: boolean
}

/** A straight line, a cubic, or the closed outline of a tapered branch. */
export type MindMapSegment =
  | { kind: 'line'; from: Point; to: Point }
  | { kind: 'curve'; from: Point; control: [Point, Point]; to: Point }
  | {
      kind: 'ribbon'
      /** Along the top edge, out from the centre. */
      out: { from: Point; control: [Point, Point]; to: Point }
      /** Across the thin tip. */
      tip: Point
      /** Along the bottom edge, back to the centre. The shape is then closed. */
      back: { control: [Point, Point]; to: Point }
    }

export type Point = [number, number]

export interface MindMapLegendEntry {
  tone: MindMapTone
  title: string
}

export interface MindMap {
  width: number
  height: number
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  /** What each colour means. The radial map has no room for a section node, so
   * the section becomes the branch's COLOUR — and a colour that is not named
   * anywhere is decoration, not information. */
  legend: MindMapLegendEntry[]
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
  leafGap: 19,
  groupGap: 22,
  margin: 16,
  radial: {
    root: { width: 190, fontSize: 14, maxLines: 4, bold: true },
    leaf: { width: 168, fontSize: 12, maxLines: 3, bold: false },
    innerRadius: 126,
    arc: 52,
    ribbonRoot: 9,
    ribbonLeaf: 1.6,
    twigHeight: 1.6,
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
/** When a bullet carries no label at all, this many words of it become one. */
const DERIVED_LABEL_WORDS = 5

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
 * What the map WRITES on a leaf: the bullet's label, or the opening words of it.
 *
 * The fallback matters as much as the split. A real answer came back as
 * "Estudar o documento enviado sobre definição de acidente de trabalho: revisar
 * o material…" — ten words before the colon, so no label — and drawing the whole
 * sentence put three elided lines where a branch should be. Cutting it to its
 * first words is not losing anything: the sentence is written out in full in the
 * section below, and lives in the node's `text`.
 */
export function leafLabel(item: string): string {
  const { label } = splitBulletLabel(item)
  if (label) return label

  const words = item.trim().split(/\s+/).filter(Boolean)
  if (words.length <= DERIVED_LABEL_WORDS) return words.join(' ')

  return `${words.slice(0, DERIVED_LABEL_WORDS).join(' ')}…`
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
 * for the screen, where the whole text is one hover away. */
export const estimateLines: MindMapMeasure = (text, spec) => {
  const ratio = spec.bold ? BOLD_CHAR_RATIO : CHAR_RATIO
  const maxChars = Math.max(8, Math.floor(spec.width / (spec.fontSize * ratio)))
  const lines = wrapText(text, maxChars, spec.maxLines)
  const longest = lines.reduce((most, line) => Math.max(most, line.length), 0)

  return { lines, width: Math.min(spec.width, longest * spec.fontSize * ratio) }
}

interface Context {
  geometry: MindMapGeometry
  measure: MindMapMeasure
}

interface NodeInput {
  id: string
  kind: MindMapNodeKind
  /** What the node SAYS. */
  label: string
  /** What it STANDS FOR — the whole bullet, when the label is its title. */
  text: string
  spec: MindMapBoxSpec
  tone?: MindMapTone
  align?: 'left' | 'right' | 'center'
  /** A leaf is bare text on a twig; the root is a box with padding around it. */
  padded?: boolean
}

function buildNode(context: Context, input: NodeInput): MindMapNode {
  const { geometry } = context
  const { lines, width } = context.measure(input.label, input.spec)
  const padX = input.padded ? geometry.padX : 0
  const padY = input.padded ? geometry.padY : 0

  return {
    id: input.id,
    kind: input.kind,
    tone: input.tone,
    text: input.text,
    lines,
    align: input.align ?? 'left',
    x: 0,
    y: 0,
    width: (input.padded ? input.spec.width : width) + padX * 2,
    height: padY * 2 + lines.length * geometry.lineHeight,
    fontSize: input.spec.fontSize,
    bold: input.spec.bold,
    textX: padX,
    textY: padY + input.spec.fontSize,
    lineHeight: geometry.lineHeight,
  }
}

function line(from: Point, to: Point): MindMapSegment {
  return { kind: 'line', from, to }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function centerY(node: MindMapNode): number {
  return node.y + node.height / 2
}

/**
 * The mind map proper: the headline in the middle, every bullet a leaf fanning
 * out to one side or the other on a branch that tapers as it goes.
 *
 * Radial only became possible when the bullets started carrying a short LABEL
 * (see `leafLabel`). While a leaf was a whole sentence, laying them around a
 * centre meant either rotating paragraphs or a drawing three times wider than
 * the page; with two to five words per leaf the classic shape fits the same
 * reading column — 768px on screen, an A4 text block in the document.
 *
 * The fan is what makes it read as a map instead of a bracket: leaves stack
 * vertically (which is what guarantees they never overlap) while their DISTANCE
 * from the centre follows an arc, so the middle of each side reaches further out
 * than its ends — the shape a compass draws, without the collision maths a true
 * polar layout would need.
 */
function buildRadial(context: Context, input: MindMapInput): MindMap {
  const { geometry } = context
  const { radial } = geometry
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []

  const root = buildNode(context, {
    id: 'root',
    kind: 'root',
    label: input.headline,
    text: input.headline,
    spec: radial.root,
    align: 'center',
    padded: true,
  })
  root.x = -root.width / 2
  root.y = -root.height / 2
  nodes.push(root)

  // Two sections take a side each; a single one is split between them, because
  // a mind map with everything on the right is a list that learned to curve.
  const sides = assignSides(input.groups)

  sides.forEach((side) => {
    const leaves = side.items.map((item, index) =>
      buildNode(context, {
        id: `leaf-${side.key}-${index}`,
        kind: 'leaf',
        label: leafLabel(item.text),
        text: item.text,
        spec: radial.leaf,
        tone: item.tone,
        align: side.direction > 0 ? 'left' : 'right',
      }),
    )
    if (leaves.length === 0) return

    const total =
      leaves.reduce((height, leaf) => height + leaf.height, 0) +
      geometry.leafGap * (leaves.length - 1)

    let cursor = -total / 2
    leaves.forEach((leaf, index) => {
      // -1 at the top of the fan, 0 in the middle, +1 at the bottom.
      const spread = leaves.length === 1 ? 0 : (index / (leaves.length - 1)) * 2 - 1
      const distance = radial.innerRadius + radial.arc * (1 - spread * spread)

      leaf.y = cursor
      leaf.x = side.direction > 0 ? distance : -distance - leaf.width
      cursor += leaf.height + geometry.leafGap

      // The twig the label sits on, and the branch that reaches it.
      const twigY = leaf.y + leaf.height + 1
      const anchor: Point = [side.direction > 0 ? leaf.x : leaf.x + leaf.width, twigY]
      const tip: Point = [side.direction > 0 ? leaf.x + leaf.width : leaf.x, twigY]

      edges.push({
        id: `twig-${leaf.id}`,
        tone: leaf.tone!,
        segments: [line(anchor, tip)],
        path: '',
        filled: false,
      })

      // Branches leave the centre spread along its edge instead of all from one
      // point: a starburst from a single spot reads as a wheel, not a plant.
      const origin: Point = [
        side.direction > 0 ? root.x + root.width : root.x,
        spread * (root.height / 2) * 0.55,
      ]
      edges.push({
        id: `branch-${leaf.id}`,
        tone: leaf.tone!,
        segments: [ribbon(origin, anchor, radial.ribbonRoot, radial.ribbonLeaf)],
        path: '',
        filled: true,
      })
    })

    nodes.push(...leaves)
  })

  return normalize(context, nodes, edges, legendOf(input.groups))
}

interface SideAssignment {
  key: string
  direction: 1 | -1
  items: { text: string; tone: MindMapTone }[]
}

/**
 * Which bullets go on which side.
 *
 * With two sections it is one each, so the colour of a side means something.
 * With ONE section the items alternate between the sides — a fan on the right
 * and nothing on the left is not a mind map, it is a list with curves.
 */
function assignSides(groups: MindMapGroup[]): SideAssignment[] {
  if (groups.length >= 2) {
    return groups.slice(0, 2).map((group, index) => ({
      key: String(index),
      direction: index === 0 ? 1 : -1,
      items: group.items.map((text) => ({ text, tone: group.tone })),
    }))
  }

  const [only] = groups
  const right: SideAssignment = { key: 'r', direction: 1, items: [] }
  const left: SideAssignment = { key: 'l', direction: -1, items: [] }
  only.items.forEach((text, index) => {
    // Down the right first, then down the left: reading order survives, which a
    // strict alternation would scramble.
    const half = Math.ceil(only.items.length / 2)
    ;(index < half ? right : left).items.push({ text, tone: only.tone })
  })

  return [right, left]
}

function legendOf(groups: MindMapGroup[]): MindMapLegendEntry[] {
  return groups.map((group) => ({ tone: group.tone, title: group.title }))
}

/**
 * The tapered outline of one branch: out along the top edge, across the tip,
 * back along the bottom. Filled, not stroked — a stroke of even width is a wire,
 * and a branch that thins as it grows is what makes the drawing look grown
 * rather than plotted.
 */
function ribbon(from: Point, to: Point, widthFrom: number, widthTo: number): MindMapSegment {
  const [x0, y0] = from
  const [x1, y1] = to
  const reach = (x1 - x0) * 0.55
  const half0 = widthFrom / 2
  const half1 = widthTo / 2

  return {
    kind: 'ribbon',
    out: {
      from: [x0, y0 - half0],
      control: [
        [x0 + reach, y0 - half0],
        [x1 - reach, y1 - half1],
      ],
      to: [x1, y1 - half1],
    },
    tip: [x1, y1 + half1],
    back: {
      control: [
        [x1 - reach, y1 + half1],
        [x0 + reach, y0 + half0],
      ],
      to: [x0, y0 + half0],
    },
  }
}

/**
 * The stacked layout, for a phone: headline on top, each section below it, its
 * bullets indented under a spine.
 *
 * The same tree, only the direction of "below" changed. The alternative was
 * scrolling the radial map sideways, which on a touch screen fights the page
 * scroll for the same gesture.
 */
function buildNarrow(context: Context, input: MindMapInput): MindMap {
  const { geometry } = context
  const { narrow } = geometry
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []
  const spineX = narrow.indent / 2

  const root = buildNode(context, {
    id: 'root',
    kind: 'root',
    label: input.headline,
    text: input.headline,
    spec: narrow.root,
    padded: true,
  })
  nodes.push(root)
  let cursor = root.height + narrow.rootGap
  // Where the line down the gutter got to. Each section continues it from
  // there, so the tree reads as one line instead of floating segments.
  let spineFrom = root.height

  input.groups.forEach((group, groupIndex) => {
    const branch = buildNode(context, {
      id: `branch-${groupIndex}`,
      kind: 'branch',
      label: group.title,
      text: group.title,
      spec: narrow.branch,
      tone: group.tone,
      padded: true,
    })
    branch.y = cursor
    nodes.push(branch)
    cursor += branch.height

    // Straight down the gutter: a curve between two boxes of the same width
    // stacked on top of each other only wobbles.
    edges.push({
      id: `edge-root-${groupIndex}`,
      tone: group.tone,
      segments: [line([spineX, spineFrom], [spineX, branch.y])],
      path: '',
      filled: false,
    })

    const leaves = group.items.map((item, itemIndex) =>
      buildNode(context, {
        id: `leaf-${groupIndex}-${itemIndex}`,
        kind: 'leaf',
        label: item,
        text: item,
        spec: narrow.leaf,
        tone: group.tone,
        padded: true,
      }),
    )

    cursor += geometry.leafGap
    leaves.forEach((leaf) => {
      leaf.x = narrow.indent
      leaf.y = cursor
      cursor += leaf.height + geometry.leafGap
      edges.push({
        id: `edge-${branch.id}-${leaf.id}`,
        tone: group.tone,
        segments: [line([spineX, centerY(leaf)], [leaf.x, centerY(leaf)])],
        path: '',
        filled: false,
      })
    })
    nodes.push(...leaves)

    if (leaves.length > 0) {
      // One spine per section, ending at the LAST leaf's line instead of its
      // bottom, so the vertical does not stick out past the tree.
      spineFrom = centerY(leaves[leaves.length - 1])
      edges.push({
        id: `edge-spine-${groupIndex}`,
        tone: group.tone,
        segments: [line([spineX, branch.y + branch.height], [spineX, spineFrom])],
        path: '',
        filled: false,
      })
    } else {
      spineFrom = branch.y + branch.height
    }

    cursor += narrow.groupGap - geometry.leafGap
  })

  return normalize(context, nodes, edges, [])
}

/**
 * Moves the drawing into positive coordinates, adds the margin and reports the
 * box it needs. The radial layout is built around an origin in the MIDDLE (which
 * is what makes fanning to both sides trivial), so half of it starts negative —
 * a viewBox that began at 0 would simply cut that half off.
 */
function normalize(
  context: Context,
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  legend: MindMapLegendEntry[],
): MindMap {
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

  const movedEdges = edges.map((edge) => {
    const segments = edge.segments.map((segment) => shift(segment, offsetX, offsetY))
    return { ...edge, segments, path: toPath(segments) }
  })

  return {
    width: Math.round(Math.max(...moved.map((node) => node.x + node.width)) + margin),
    height: Math.round(Math.max(...moved.map((node) => node.y + node.height)) + margin),
    nodes: moved,
    edges: movedEdges,
    legend,
  }
}

function shift(segment: MindMapSegment, offsetX: number, offsetY: number): MindMapSegment {
  const move = ([x, y]: Point): Point => [round(x + offsetX), round(y + offsetY)]

  if (segment.kind === 'line') return { kind: 'line', from: move(segment.from), to: move(segment.to) }
  if (segment.kind === 'curve') {
    return {
      kind: 'curve',
      from: move(segment.from),
      control: [move(segment.control[0]), move(segment.control[1])],
      to: move(segment.to),
    }
  }

  return {
    kind: 'ribbon',
    out: {
      from: move(segment.out.from),
      control: [move(segment.out.control[0]), move(segment.out.control[1])],
      to: move(segment.out.to),
    },
    tip: move(segment.tip),
    back: {
      control: [move(segment.back.control[0]), move(segment.back.control[1])],
      to: move(segment.back.to),
    },
  }
}

/** The same segments as an SVG `d`, for the browser. */
function toPath(segments: MindMapSegment[]): string {
  return segments
    .map((segment) => {
      if (segment.kind === 'line') {
        return `M ${segment.from[0]} ${segment.from[1]} L ${segment.to[0]} ${segment.to[1]}`
      }
      if (segment.kind === 'curve') {
        return `M ${segment.from[0]} ${segment.from[1]} C ${segment.control[0][0]} ${segment.control[0][1]}, ${segment.control[1][0]} ${segment.control[1][1]}, ${segment.to[0]} ${segment.to[1]}`
      }
      return [
        `M ${segment.out.from[0]} ${segment.out.from[1]}`,
        `C ${segment.out.control[0][0]} ${segment.out.control[0][1]}, ${segment.out.control[1][0]} ${segment.out.control[1][1]}, ${segment.out.to[0]} ${segment.out.to[1]}`,
        `L ${segment.tip[0]} ${segment.tip[1]}`,
        `C ${segment.back.control[0][0]} ${segment.back.control[0][1]}, ${segment.back.control[1][0]} ${segment.back.control[1][1]}, ${segment.back.to[0]} ${segment.back.to[1]}`,
        'Z',
      ].join(' ')
    })
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

  return options.orientation === 'radial'
    ? buildRadial(context, usable)
    : buildNarrow(context, usable)
}
