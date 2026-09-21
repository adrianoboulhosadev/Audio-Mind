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
 * The drop zone, modelled on Aceternity UI's FileUpload: a plate that lifts
 * under the pointer, and the chosen file sliding in as a card with its real
 * details instead of a filename in grey text.
 *
 * The original draws a chequerboard behind all of it. It is gone: the panel is
 * one flat surface now. The pattern fought with every panel around it and was
 * the loudest thing on a screen whose subject is the file, not the box.
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
      {/* The dashed edge only exists under the pointer (and under keyboard
          focus, which has nothing else to show). It stays `border-transparent`
          rather than going away, so a hover never reflows the panel by the two
          pixels the border occupies.

          `initial="initial"` belongs on this parent, not only on the children:
          without a variant named here motion has nothing to resolve at mount,
          so every child's `initial` entry is skipped and the dashed plate
          inside comes up already visible. */}
      <motion.div
        initial="initial"
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
          dragging
            ? 'border-accent bg-accent-soft/20'
            : 'border-transparent hover:border-accent focus-visible:border-accent'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />

        <div className="flex flex-col items-center justify-center">
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
                className="relative z-20 mx-auto flex w-full flex-col gap-1 rounded-lg border border-line2 bg-panel2 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="truncate text-sm text-ink">{file.name}</p>
                  <span className="shrink-0 rounded-md border border-line2 px-2 py-0.5 text-xs tabular-nums text-muted">
                    {formatBytes(file.size)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-muted">
                  <span className="truncate rounded-md border border-line px-1.5 py-0.5">
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
                className="relative z-20 mx-auto flex h-24 w-full items-center justify-center rounded-lg border border-line2 bg-panel2"
              >
                <UploadCloud size={22} className="text-muted" aria-hidden />
              </motion.div>
            )}

            {!file ? (
              // The second plate, offset the other way — it only exists so the
              // first one has something to lift off, so it is invisible until
              // the pointer is actually over the zone.
              <motion.div
                initial="initial"
                variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
                className="absolute inset-0 z-10 mx-auto flex h-24 w-full rounded-lg border border-dashed border-accent/50"
              />
            ) : null}
          </div>

          {hint ? <p className="mt-5 text-xs text-muted">{hint}</p> : null}
        </div>
      </motion.div>
    </div>
  )
}
