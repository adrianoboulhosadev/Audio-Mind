'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { buildMindMap, type MindMapOrientation } from '@/lib/mind-map-layout'
import { EXPORTED_PALETTE_VARS, MIND_MAP_SECTION_TITLES } from '../data/mind-map-theme'

interface Input {
  headline: string
  topics: string[]
  actionItems: string[]
}

/** Above this the mirrored map fits; below it the stacked one is drawn. Matches
 * Tailwind's `lg`, which is where the app already switches its navigation. */
const WIDE_QUERY = '(min-width: 1024px)'

/** Twice the CSS size, so the PNG is not soft on a retina screen or when
 * somebody drops it into a slide. */
const EXPORT_SCALE = 2

export function useMindMap({ headline, topics, actionItems }: Input) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [exporting, setExporting] = useState(false)
  // Starts narrow so the server render and the first client render agree —
  // matchMedia only exists after mount, and guessing wide would flash the wrong
  // layout on every phone.
  const [orientation, setOrientation] = useState<MindMapOrientation>('narrow')

  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY)
    const apply = () => setOrientation(query.matches ? 'wide' : 'narrow')
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  const map = useMemo(
    () =>
      buildMindMap(
        {
          headline,
          groups: [
            { tone: 'topic', title: MIND_MAP_SECTION_TITLES.topic, items: topics },
            { tone: 'action', title: MIND_MAP_SECTION_TITLES.action, items: actionItems },
          ],
        },
        orientation,
      ),
    [headline, topics, actionItems, orientation],
  )

  /**
   * Saves the map as a PNG, entirely in the browser: the drawing is already
   * here, and a round trip to the server would mean rendering SVG on the
   * backend just to hand back what the screen is showing.
   */
  const exportPng = async () => {
    const svg = svgRef.current
    if (!svg || !map) return

    setExporting(true)
    let objectUrl: string | null = null
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement
      const palette = getComputedStyle(document.documentElement)
      EXPORTED_PALETTE_VARS.forEach((name) => {
        clone.style.setProperty(name, palette.getPropertyValue(name).trim())
      })
      // Explicit size and namespace: the browser will not rasterize an SVG that
      // relies on its container for either.
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', String(map.width))
      clone.setAttribute('height', String(map.height))

      const source = new XMLSerializer().serializeToString(clone)
      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Falha ao desenhar o mapa'))
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
      })

      const canvas = document.createElement('canvas')
      canvas.width = map.width * EXPORT_SCALE
      canvas.height = map.height * EXPORT_SCALE
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas indisponível')
      context.scale(EXPORT_SCALE, EXPORT_SCALE)
      context.drawImage(image, 0, 0, map.width, map.height)

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Falha ao gerar o PNG')

      objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${headline}.png`
      link.click()
    } catch {
      toast.error('Não consegui gerar a imagem do mapa.')
    } finally {
      // Same rule as the audio blob elsewhere: without this every export leaves
      // another copy of the image in memory for as long as the tab is open.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setExporting(false)
    }
  }

  return { map, svgRef, exportPng, exporting }
}
