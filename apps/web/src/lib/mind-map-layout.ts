/**
 * The geometry of the mind map, as a pure function: text in, boxes and curves
 * out. No React and no DOM, which is what keeps the component JSX-only and what
 * makes the hard part (wrapping, stacking, not overlapping) testable.
 *
 * The map is DERIVED from the summary already on the screen — headline in the
 * middle, one branch per section, one leaf per bullet. There is no second model
 * call behind it: the two would be free to disagree about the same audio, and a
 * map contradicting the summary right above it is worse than no map.
 *
 * SVG has no text wrapping, so every label is broken into lines here and
 * rendered as tspans. The break is measured in CHARACTERS against an average
 * glyph width, not by measuring the real font — the map has generous boxes and
 * the full text is a tooltip away, so being a character off never costs more
 * than a slightly early break.
 */

export type MindMapTone = 'topic' | 'action'
export type MindMapNodeKind = 'root' | 'branch' | 'leaf'

/** Two-sided when there is room for it, a single stacked column when there is
 * not. A phone gets the stack: the mirrored layout is 700px wide before it
 * starts, and scaled down to fit it becomes 4px type. */
export type MindMapOrientation = 'wide' | 'narrow'

export interface MindMapNode {
  id: string
  kind: MindMapNodeKind
  /** Absent on the root, which belongs to no section. */
  tone?: MindMapTone
  /** The whole label — the accessible name and the tooltip. */
  text: string
  /** The label as it is DRAWN: wrapped, and elided when it did not fit. The
   * whole text stays in `text`, which is what the tooltip shows. */
  lines: string[]
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  /** Where the label starts and how far apart its lines sit. Computed here so
   * the component never has to know the padding — two copies of the same number
   * is how a box and the text inside it drift apart. */
  textX: number
  /** Baseline of the FIRST line. */
  textY: number
  lineHeight: number
}

export interface MindMapEdge {
  id: string
  path: string
  tone: MindMapTone
}

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

const GEOMETRY = {
  lineHeight: 15,
  padX: 12,
  padY: 9,
  leafGap: 9,
  /** Between one section and the next, so the two do not read as one list. */
  groupGap: 24,
  /** Horizontal breathing room between levels (wide) / vertical (narrow). */
  levelGap: 44,
  margin: 18,
  /** Average glyph width as a fraction of the font size, for a sans face. A
   * bold face is measurably wider, and using one number for both is what makes
   * a section title touch the edge of its own box. */
  charRatio: 0.57,
  boldCharRatio: 0.63,
  wide: {
    root: { width: 200, fontSize: 14, maxLines: 4 },
    branch: { width: 156, fontSize: 12, maxLines: 2 },
    leaf: { width: 216, fontSize: 12, maxLines: 4 },
  },
  narrow: {
    root: { width: 258, fontSize: 14, maxLines: 4 },
    branch: { width: 258, fontSize: 12, maxLines: 2 },
    leaf: { width: 236, fontSize: 12, maxLines: 6 },
    /** How far a leaf sits from the section it belongs to. The spine is drawn
     * inside this gutter. */
    indent: 22,
    /** Vertical space between a section and the one before it. */
    groupGap: 20,
    rootGap: 18,
  },
}

/**
 * Breaks a label into the lines that fit `maxChars`, eliding the rest.
 *
 * A word longer than a whole line is broken by force: left alone it would run
 * past the box, and SVG clips nothing by default — the text would simply
 * overlap whatever is next to it.
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

interface BoxSpec {
  width: number
  fontSize: number
  maxLines: number
}

function buildNode(
  id: string,
  kind: MindMapNodeKind,
  text: string,
  spec: BoxSpec,
  tone?: MindMapTone,
): MindMapNode {
  // The root and the section titles are drawn bold (see the component).
  const ratio = kind === 'leaf' ? GEOMETRY.charRatio : GEOMETRY.boldCharRatio
  const maxChars = Math.max(8, Math.floor((spec.width - GEOMETRY.padX * 2) / (spec.fontSize * ratio)))
  const lines = wrapText(text, maxChars, spec.maxLines)

  return {
    id,
    kind,
    tone,
    text,
    lines,
    x: 0,
    y: 0,
    width: spec.width,
    height: GEOMETRY.padY * 2 + lines.length * GEOMETRY.lineHeight,
    fontSize: spec.fontSize,
    textX: GEOMETRY.padX,
    textY: GEOMETRY.padY + spec.fontSize,
    lineHeight: GEOMETRY.lineHeight,
  }
}

/** A cubic between two points, flat at both ends — the same shape whether the
 * child is to the right of the parent or to the left. */
function curve(x1: number, y1: number, x2: number, y2: number): string {
  const handle = (x2 - x1) / 2
  return `M ${round(x1)} ${round(y1)} C ${round(x1 + handle)} ${round(y1)}, ${round(x2 - handle)} ${round(y2)}, ${round(x2)} ${round(y2)}`
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
 * prettier picture, but it needs about 1200px before it starts — and both
 * screens that show this are a 768px reading column, so it would have to be
 * shrunk until the type was unreadable, or scrolled sideways. This one fits the
 * column as it is.
 *
 * Not a radial either: these labels are SENTENCES (a bullet goes up to 300
 * characters). A radial has to rotate them or place them around a circle;
 * stacked boxes keep every line horizontal and never overlap, which is worth
 * more here than the shape of a textbook mind map.
 */
function buildWide(input: MindMapInput): MindMap {
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []
  const { wide } = GEOMETRY

  const root = buildNode('root', 'root', input.headline, wide.root)
  const branchX = wide.root.width + GEOMETRY.levelGap
  const leafX = branchX + wide.branch.width + GEOMETRY.levelGap

  const branches: MindMapNode[] = []
  let cursor = 0

  input.groups.forEach((group, groupIndex) => {
    const branch = buildNode(`branch-${groupIndex}`, 'branch', group.title, wide.branch, group.tone)
    const leaves = group.items.map((item, itemIndex) =>
      buildNode(`leaf-${groupIndex}-${itemIndex}`, 'leaf', item, wide.leaf, group.tone),
    )

    const top = cursor
    leaves.forEach((leaf) => {
      leaf.x = leafX
      leaf.y = cursor
      cursor += leaf.height + GEOMETRY.leafGap
    })
    const bottom = cursor - GEOMETRY.leafGap

    // The section sits at the middle of what it holds, so the line into it
    // points at the group and not at its first item.
    branch.x = branchX
    branch.y = (top + bottom) / 2 - branch.height / 2
    branches.push(branch)
    nodes.push(branch, ...leaves)

    leaves.forEach((leaf) => {
      edges.push({
        id: `edge-${branch.id}-${leaf.id}`,
        tone: group.tone,
        path: curve(branch.x + branch.width, centerY(branch), leaf.x, centerY(leaf)),
      })
    })

    cursor = bottom + GEOMETRY.groupGap
  })

  // The headline is centred on the whole tree, not on the first section.
  const treeHeight = cursor - GEOMETRY.groupGap
  root.x = 0
  root.y = Math.max(0, (treeHeight - root.height) / 2)
  nodes.unshift(root)

  branches.forEach((branch, groupIndex) => {
    edges.unshift({
      id: `edge-root-${groupIndex}`,
      tone: input.groups[groupIndex].tone,
      path: curve(root.x + root.width, centerY(root), branch.x, centerY(branch)),
    })
  })

  return normalize(nodes, edges)
}

/**
 * The stacked layout, for a phone: headline on top, each section below it, its
 * bullets indented under a spine.
 *
 * It is the same tree — only the direction of "below" changed. The alternative
 * was scrolling the wide map sideways, which on a touch screen fights the page
 * scroll for the same gesture.
 */
function buildNarrow(input: MindMapInput): MindMap {
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []
  const { narrow } = GEOMETRY
  const spineX = narrow.indent / 2

  const root = buildNode('root', 'root', input.headline, narrow.root)
  nodes.push(root)
  let cursor = root.height + narrow.rootGap
  // Where the line down the gutter got to. Each section continues it from
  // there, so the tree reads as one line instead of floating segments.
  let spineFrom = root.height

  input.groups.forEach((group, groupIndex) => {
    const branch = buildNode(`branch-${groupIndex}`, 'branch', group.title, narrow.branch, group.tone)
    branch.y = cursor
    nodes.push(branch)
    cursor += branch.height

    edges.push({
      id: `edge-root-${groupIndex}`,
      tone: group.tone,
      // Straight down the gutter: a curve between two boxes of the same width
      // stacked on top of each other only wobbles.
      path: `M ${spineX} ${round(spineFrom)} V ${round(branch.y)}`,
    })

    const leaves = group.items.map((item, itemIndex) =>
      buildNode(`leaf-${groupIndex}-${itemIndex}`, 'leaf', item, narrow.leaf, group.tone),
    )

    cursor += GEOMETRY.leafGap
    leaves.forEach((leaf) => {
      leaf.x = narrow.indent
      leaf.y = cursor
      cursor += leaf.height + GEOMETRY.leafGap
      edges.push({
        id: `edge-${branch.id}-${leaf.id}`,
        tone: group.tone,
        path: `M ${spineX} ${round(centerY(leaf))} H ${round(leaf.x)}`,
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
        path: `M ${spineX} ${round(branch.y + branch.height)} V ${round(spineFrom)}`,
      })
    } else {
      spineFrom = branch.y + branch.height
    }

    cursor += narrow.groupGap - GEOMETRY.leafGap
  })

  return normalize(nodes, edges)
}

/**
 * Adds the margin and reports the box the drawing needs — the viewBox of the
 * SVG. Both layouts are built from an origin at the top left, so this only has
 * to make room around them.
 */
function normalize(nodes: MindMapNode[], edges: MindMapEdge[]): MindMap {
  const offsetX = GEOMETRY.margin - Math.min(...nodes.map((node) => node.x))
  const offsetY = GEOMETRY.margin - Math.min(...nodes.map((node) => node.y))

  const moved = nodes.map((node) => ({
    ...node,
    x: round(node.x + offsetX),
    y: round(node.y + offsetY),
    textX: round(node.x + offsetX + node.textX),
    textY: round(node.y + offsetY + node.textY),
  }))
  const movedEdges = edges.map((edge) => ({ ...edge, path: translatePath(edge.path, offsetX, offsetY) }))

  return {
    width: Math.round(Math.max(...moved.map((node) => node.x + node.width)) + GEOMETRY.margin),
    height: Math.round(Math.max(...moved.map((node) => node.y + node.height)) + GEOMETRY.margin),
    nodes: moved,
    edges: movedEdges,
  }
}

/** Shifts a path built around the origin. Only the commands this file emits
 * are handled (M, C, V, H) — a general SVG path parser would be a library. */
function translatePath(path: string, offsetX: number, offsetY: number): string {
  return path.replace(/([MCVH])\s([^MCVH]*)/g, (_match, command: string, body: string) => {
    if (command === 'V') return `V ${round(Number(body.trim()) + offsetY)} `
    if (command === 'H') return `H ${round(Number(body.trim()) + offsetX)} `

    const pairs = body
      .trim()
      .split(',')
      .map((pair) => {
        const [x, y] = pair.trim().split(/\s+/).map(Number)
        return `${round(x + offsetX)} ${round(y + offsetY)}`
      })
    return `${command} ${pairs.join(', ')} `
  })
}

/**
 * The whole map. Returns null when there is nothing to branch into: a lone
 * headline in a box is not a mind map, and drawing one would make an empty
 * summary look like a broken feature.
 */
export function buildMindMap(input: MindMapInput, orientation: MindMapOrientation): MindMap | null {
  const groups = input.groups.filter((group) => group.items.length > 0)
  if (!input.headline.trim() || groups.length === 0) return null

  const usable: MindMapInput = { headline: input.headline, groups }
  return orientation === 'wide' ? buildWide(usable) : buildNarrow(usable)
}
