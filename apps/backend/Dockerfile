# Build context is the repo root (needs the npm workspace packages).
FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .
# REQUIRED, and easy to miss: .dockerignore excludes node_modules, so without
# this the image has no dependencies at all and the build dies with exit 127
# (nest/tsup not found) on the first workspace package.
RUN npm ci
RUN npx turbo run build --filter=backend...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo .
# The uploads directory must exist AND belong to `node` before the volume is
# mounted over it: Docker initializes an empty named volume from whatever the
# image has at that path, ownership included. Without this the volume comes up
# owned by root and the app (running as `node`) dies at boot with EACCES on
# mkdir, because main.ts creates the per-theme subfolders.
RUN mkdir -p /repo/apps/backend/uploads && chown -R node:node /repo/apps/backend/uploads
WORKDIR /repo/apps/backend
# Pre-existing non-root user in the node base image — no reason for a
# stateless API process to run as root.
USER node
EXPOSE 5000
# Applies any pending migration BEFORE the API accepts traffic, so a deploy can
# never serve a schema the code does not match. `migrate deploy` is the
# production command: it only replays committed migrations, never generates or
# edits one. If it fails the container stops instead of booting against a wrong
# schema, which is the outcome we want.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=/repo/packages/database/prisma/schema.prisma && npm start"]
