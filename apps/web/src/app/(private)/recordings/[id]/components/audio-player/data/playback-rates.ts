/** The speeds worth offering for speech. Below 1 is missing on purpose: nobody
 * slows a meeting down, and every extra chip is another thing between the user
 * and the play button. */
export const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const

export type PlaybackRate = (typeof PLAYBACK_RATES)[number]
