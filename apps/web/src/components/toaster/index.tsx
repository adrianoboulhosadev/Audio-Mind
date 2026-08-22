'use client'

import { Toaster as SonnerToaster } from 'sonner'

/** Feedback for things that happen away from where the user is looking (an
 * upload that finished, a delete that went through). Styled with the palette
 * tokens so it does not arrive as a white box in a dark app. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--panel2)',
          border: '1px solid var(--line2)',
          color: 'var(--ink)',
        },
      }}
    />
  )
}
