// Rich entity re-exported as a VALUE: the apps' Prisma repository reconstitutes
// it (`new Summary({...})`) without importing @summary/core. TranscriptQuestion
// travels as a value too — the front reads its MAX_LENGTH to size the input
// instead of hardcoding a number the domain would then refuse.
export {
  Summary,
  SummaryBullet,
  SummaryHeadline,
  SummaryOverview,
  TranscriptQuestion,
} from '@summary/core'
