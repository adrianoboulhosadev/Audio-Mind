'use client'

import { splitBulletLabel } from '@summary/adapters'

/**
 * One bullet of a summary, as the model was asked to write it: "Rótulo curto:
 * explicação".
 *
 * The label is drawn apart because it is the same label the mind map puts in a
 * node and the PDF prints in bold — one shape, three places, so the eye finds
 * the same handle in all of them.
 *
 * A bullet with no label (a summary produced before the prompt asked for one, or
 * a model that ignored it) is simply printed whole: the split is tolerant on
 * purpose, and an old recording has to keep reading fine without being
 * reprocessed.
 */
export function SummaryBullet({ text, dotClassName }: { text: string; dotClassName: string }) {
  const { label, detail } = splitBulletLabel(text)

  return (
    <li className="flex gap-2 text-sm text-ink2">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} />
      <span className="min-w-0">
        {label ? <strong className="font-semibold text-ink">{label}: </strong> : null}
        {detail}
      </span>
    </li>
  )
}
