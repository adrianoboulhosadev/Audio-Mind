// Re-exported as VALUES: the backend's Prisma repository reconstitutes the
// entity (`new ShareLink({...})`), and the front builds its window picker from
// SHARE_WINDOWS — hardcoding "24h / 7d / 30d" in the UI would be a promise the
// domain might stop keeping.
export { ShareLink, ShareToken, ShareScope, SHARE_WINDOWS, toShareWindow } from '@sharing/core'
export type { ShareWindow } from '@sharing/core'
