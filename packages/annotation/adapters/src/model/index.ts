// Re-exported as VALUES: the backend's Prisma repository reconstitutes the
// entity (`new Annotation({...})`), and the front sizes its note field from the
// value object's own ceiling instead of hardcoding a number the domain would
// then refuse.
export { Annotation, AnnotationNote, AnnotationTime } from '@annotation/core'
