// Rich domain entities re-exported as VALUES (they are classes, not interfaces):
// the app's driven adapters (Prisma repositories) reconstitute them via the
// constructor — `new User({...})` — without importing @auth/core. Adapters is
// the only public surface of the context.
export { User, AuthSession } from '@auth/core'
// Domain event classes, re-exported as VALUES so an app-layer listener can
// `instanceof` against the real class, not just a structural type.
export { UserRegistered } from '@auth/core'
