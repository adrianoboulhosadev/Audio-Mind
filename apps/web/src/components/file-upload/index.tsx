'use client'

import { useRef, useState, type DragEvent } from 'react'
import { motion } from 'motion/react'
import { UploadCloud } from 'lucide-react'
import { formatBytes } from '@/lib/format'

interface FileUploadProps {
  onChange: (file: File | null) => void
  /** The picked file, owned by the parent — this component draws state, it does
   * not keep it. Clearing it upstream clears the card here. */
  file: File | null
  accept?: string
  hint?: string
}

/**
 * The drop zone, modelled on Aceternity UI's FileUpload: a grid-patterned panel
 * that lifts under the pointer, and the chosen file sliding in as a card with
 * its real details instead of a filename in grey text.
 *
 * Reimplemented rather than installed. `npx shadcn@latest add
 * @aceternity/file-upload` pulls from ui.aceternity.com, and the component it
 * writes styles itself with raw Tailwind colours (`neutral-800`, `dark:` pairs)
 * — this app's rule is that every colour comes from the palette's CSS variables.
 * So the anatomy and the motion are the same and the paint is ours.
 */
export function FileUpload({ onChange, file, accept, hint }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    onChange(event.dataTransfer.files?.[0] ?? null)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <motion.div
        whileHover="animate"
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        aria-label="Escolher um arquivo de áudio"
        className={`group/upload relative w-full cursor-pointer overflow-hidden rounded-xl border border-dashed p-8 transition-colors ${
          dragging ? 'border-accent bg-accent-soft/20' : 'border-line2 bg-panel2/40 hover:border-accent'
        }`}
      >
        <GridPattern />

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />

        <div className="relative flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-ink">Enviar um áudio</p>
          <p className="mt-1 text-xs text-muted">
            {dragging ? 'Solte o arquivo aqui' : 'Arraste e solte, ou clique para escolher'}
          </p>

          <div className="relative mt-6 w-full max-w-xl">
            {file ? (
              <motion.div
                layoutId="file-upload-card"
                initial={{ opacity: 0, scaleX: 0.96 }}
                animate={{ opacity: 1, scaleX: 1 }}
                className="relative z-20 mx-auto flex w-full flex-col gap-1 rounded-lg border border-line2 bg-panel p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="truncate text-sm text-ink">{file.name}</p>
                  <span className="shrink-0 rounded-md border border-line2 px-2 py-0.5 text-xs tabular-nums text-muted">
                    {formatBytes(file.size)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-muted">
                  <span className="truncate rounded-md bg-panel2 px-1.5 py-0.5">
                    {file.type || 'tipo desconhecido'}
                  </span>
                  <span className="shrink-0">
                    modificado {new Date(file.lastModified).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                layoutId="file-upload-card"
                variants={{
                  initial: { x: 0, y: 0, opacity: 1 },
                  // The lift on hover: the plate rises a little and tilts, which
                  // is the whole tell that this panel is droppable.
                  animate: { x: 12, y: -12, opacity: 0.92 },
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative z-20 mx-auto flex h-24 w-full items-center justify-center rounded-lg border border-line2 bg-panel shadow-card"
              >
                <UploadCloud size={22} className="text-muted" aria-hidden />
              </motion.div>
            )}

            {!file ? (
              // The second plate, offset the other way — it only exists so the
              // first one has something to lift off.
              <motion.div
                variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
                className="absolute inset-0 z-10 mx-auto flex h-24 w-full rounded-lg border border-dashed border-accent/50"
              />
            ) : null}
          </div>

          {hint ? <p className="relative mt-5 text-xs text-muted">{hint}</p> : null}
        </div>
      </motion.div>
    </div>
  )
}

/**
 * The chequered backdrop. Built as a grid of small cells rather than an SVG
 * pattern so the two shades come from the palette variables like everything
 * else. Purely decorative — hidden from assistive tech.
 */
function GridPattern() {
  const columns = 32
  const rows = 8

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex flex-shrink-0 flex-wrap items-center justify-center gap-px opacity-40"
    >
      {Array.from({ length: rows * columns }).map((_, index) => {
        const row = Math.floor(index / columns)
        const checker = (row + (index % columns)) % 2 === 0
        return (
          <div
            key={index}
            className={`flex h-9 w-9 flex-shrink-0 rounded-[2px] ${
              checker ? 'bg-panel2' : 'bg-panel shadow-[0_0_1px_3px_var(--bg)_inset]'
            }`}
          />
        )
      })}
    </div>
  )
}
