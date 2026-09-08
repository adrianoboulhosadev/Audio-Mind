'use client'

import { Download, Network } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import type { MindMapNode } from '@/lib/mind-map-layout'
import { MIND_MAP_TONE_COLORS } from './data/mind-map-theme'
import { useMindMap } from './hooks/use-mind-map'

interface MindMapProps {
  headline: string
  topics: string[]
  actionItems: string[]
}

/**
 * The summary as a picture: the headline in the middle of it, each section a
 * branch, each bullet a leaf.
 *
 * Nothing here comes from a model — it is the summary that is already on the
 * screen, laid out. So it costs no call, works on every recording ever
 * processed without reprocessing any of them, and can never say something the
 * text above it does not.
 *
 * It brings its own card because two screens show it (the recording and the
 * public shared page) and both would otherwise copy the heading and the export
 * button. The drawing itself is hand-written SVG: a diagram library for a tree
 * of two levels would be a dependency doing less than this file.
 */
export function MindMap({ headline, topics, actionItems }: MindMapProps) {
  const { map, svgRef, exportPng, exporting } = useMindMap({ headline, topics, actionItems })

  // A headline in a box with nothing branching off it is not a map — and drawing
  // one would make a summary with no bullets look like a broken feature.
  if (!map) return null

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <Network size={13} aria-hidden />
          Mapa mental
        </h2>
        <IconButton
          label="Baixar o mapa como imagem"
          tipSide="left"
          disabled={exporting}
          onClick={exportPng}
          icon={<Download size={16} aria-hidden />}
        />
      </div>

      {/* The drawing keeps its own size and scales down only if the card is
          narrower than it is — and scrolls sideways before it ever gets small
          enough to stop being readable. */}
      <div className="mt-4 overflow-x-auto">
        <svg
          ref={svgRef}
          role="img"
          aria-label={`Mapa mental de ${headline}`}
          viewBox={`0 0 ${map.width} ${map.height}`}
          width={map.width}
          height={map.height}
          className="mx-auto h-auto max-w-full"
          // A system stack, spelled out: the exported PNG is rendered by the
          // browser from the SVG alone, where the app's web font is not loaded.
          style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' }}
        >
          {/* Painted, not transparent: a PNG with no background turns into a
              dark map on a white page the moment somebody pastes it somewhere. */}
          <rect x={0} y={0} width={map.width} height={map.height} style={{ fill: 'var(--panel)' }} />

          {map.edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              style={{ stroke: MIND_MAP_TONE_COLORS[edge.tone], opacity: 0.45 }}
            />
          ))}

          {map.nodes.map((node) => (
            <Node key={node.id} node={node} />
          ))}
        </svg>
      </div>
    </section>
  )
}

/** One box. The whole label lives in `<title>`, so what the ellipsis cut off is
 * still readable on hover and still reaches a screen reader. */
function Node({ node }: { node: MindMapNode }) {
  const tone = node.tone ? MIND_MAP_TONE_COLORS[node.tone] : 'var(--accent)'
  const isRoot = node.kind === 'root'
  const isBranch = node.kind === 'branch'

  return (
    <g>
      <title>{node.text}</title>
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={12}
        strokeWidth={isRoot ? 0 : 1}
        style={{
          fill: isRoot ? tone : 'var(--panel2)',
          stroke: isBranch ? tone : 'var(--line2)',
        }}
      />
      <text
        fontSize={node.fontSize}
        fontWeight={isRoot || isBranch ? 600 : 400}
        style={{
          fill: isRoot ? 'var(--accent-ink)' : isBranch ? tone : 'var(--ink2)',
        }}
      >
        {node.lines.map((line, index) => (
          <tspan
            key={index}
            // Every line repeats x: a tspan without it continues where the
            // previous one ended, which turns a wrapped label into a staircase.
            x={node.textX}
            y={node.textY + index * node.lineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}
