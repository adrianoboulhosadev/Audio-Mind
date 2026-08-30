import type { ReactNode } from 'react'

/**
 * The frame of a page that ANYONE can open.
 *
 * Its own route group, and not `(public)`: that one guards its screens with
 * `useRedirectAuthenticated` (a logged-in person has no business on the login
 * screen) and wraps them in a narrow centred card. Neither is true here — a
 * shared summary is a document, it is read by people with and without an
 * account, and it needs the width of a page.
 *
 * No guard at all, on purpose: the token in the URL is the whole authorization,
 * and the backend is what checks it.
 */
export default function SharedLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">{children}</main>
}
