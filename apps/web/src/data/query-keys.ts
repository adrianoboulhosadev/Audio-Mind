/**
 * The TanStack keys that more than one screen touches.
 *
 * `['recordings']` is the one that has to be spelled the same in three unrelated
 * places — the library, one recording's screen, and the SSE hook that
 * invalidates it when the worker finishes. A literal repeated across those is a
 * typo away from a push that silently stops refreshing the list.
 */
export const RECORDINGS_KEY = ['recordings']
