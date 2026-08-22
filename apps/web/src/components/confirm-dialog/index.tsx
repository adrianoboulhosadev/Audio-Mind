'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** A deliberate stop before something irreversible (deleting an audio takes its
 * transcript, its summary and its PDF with it). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-line2 bg-panel p-5 shadow-pop animate-fadeUp">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-ink2">{description}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
