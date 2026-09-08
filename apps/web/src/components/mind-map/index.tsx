'use client'

import { Network } from 'lucide-react'
import type { MindMapNode } from '@summary/adapters'
import { MIND_MAP_TONE_COLORS } from './data/mind-map-theme'
import { useMindMap } from './hooks/use-mind-map'

interface MindMapProps {
  headline: string
  topics: string[]
  actionItems: string[]
}

/**
 * The summary as a mind map: the headline in the middle, every bullet a leaf on
 * a branch that fans out and tapers as it goes.
 *
 * Nothing here comes from a model — it is the summary that is already on the
 * screen, laid out. So it costs no call, works on every recording ever
 * processed without reprocessing any of them, and can never say something the
 * text above it does not.
 *
 * The SAME geometry the PDF draws (@summary/adapters), so the picture on the
 * screen and the one in the document are the same picture — here as SVG, there
 * as vector. Hand-written both times: a diagram library for this would be a
 * dependency doing less than this file.
 */
export function MindMap({ headline, topics, actionItems }: MindMapProps) {
  const map = useMindMap({ headline, topics, actionItems })

  // A headline with nothing branching off it is not a map — and drawing one
  // would make a summary with no bullets look like a broken feature.
  if (!map) return null

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <Network size={13} aria-hidden />
          Mapa mental
        </h2>

        {/* A cor É a seção aqui (o mapa radial não tem onde caber um nó de
            seção), e cor que não é nomeada em lugar nenhum é enfeite. */}
        {map.legend.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {map.legend.map((entry) => (
              <li key={entry.tone} className="flex items-center gap-1.5 text-[11px] text-muted">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: MIND_MAP_TONE_COLORS[entry.tone] }}
                />
                {entry.title}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* The drawing keeps its own size and scales down only if the card is
          narrower than it is — and scrolls sideways before it ever gets small
          enough to stop being readable. */}
      <div className="mt-4 overflow-x-auto">
        <svg
          role="img"
          aria-label={`Mapa mental de ${headline}`}
          viewBox={`0 0 ${map.width} ${map.height}`}
          width={map.width}
          height={map.height}
          className="mx-auto h-auto max-w-full"
          style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' }}
        >
          <rect x={0} y={0} width={map.width} height={map.height} style={{ fill: 'var(--panel)' }} />

          {map.edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              // A branch is FILLED (it tapers, so it has an outline, not a
              // width); a twig is a stroked line.
              fill={edge.filled ? MIND_MAP_TONE_COLORS[edge.tone] : 'none'}
              stroke={edge.filled ? 'none' : MIND_MAP_TONE_COLORS[edge.tone]}
              strokeWidth={edge.filled ? 0 : 1.4}
              strokeLinecap="round"
              opacity={edge.filled ? 0.5 : 0.9}
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

/**
 * One node. The root is a filled box; a leaf is bare text sitting on its twig —
 * boxing every label is what made the map read as an org chart.
 *
 * The whole bullet lives in `<title>`, so what the label left out is still
 * readable on hover and still reaches a screen reader.
 */
function Node({ node }: { node: MindMapNode }) {
  const tone = node.tone ? MIND_MAP_TONE_COLORS[node.tone] : 'var(--accent)'
  const isRoot = node.kind === 'root'
  const isBranch = node.kind === 'branch'

  return (
    <g>
      <title>{node.text}</title>

      {isRoot || isBranch ? (
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={isRoot ? 16 : 10}
          strokeWidth={isRoot ? 0 : 1}
          style={{
            fill: isRoot ? tone : 'var(--panel2)',
            stroke: isBranch ? tone : 'var(--line2)',
          }}
        />
      ) : null}

      <text
        fontSize={node.fontSize}
        fontWeight={isRoot || isBranch ? 600 : 500}
        textAnchor={anchorOf(node)}
        style={{
          fill: isRoot ? 'var(--accent-ink)' : isBranch ? tone : 'var(--ink)',
        }}
      >
        {node.lines.map((line, index) => (
          <tspan
            key={index}
            // Every line repeats x: a tspan without it continues where the
            // previous one ended, which turns a wrapped label into a staircase.
            x={textOriginOf(node)}
            y={node.textY + index * node.lineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}

function anchorOf(node: MindMapNode): 'start' | 'middle' | 'end' {
  if (node.align === 'center') return 'middle'
  return node.align === 'right' ? 'end' : 'start'
}

/** Where the line is anchored FROM, which depends on which end is fixed. */
function textOriginOf(node: MindMapNode): number {
  if (node.align === 'center') return node.x + node.width / 2
  return node.align === 'right' ? node.x + node.width : node.textX
}
