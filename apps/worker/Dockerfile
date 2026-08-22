# Build context is the repo root (needs the npm workspace packages).
FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .
RUN npm ci
RUN npx turbo run build --filter=worker...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo .
# The worker READS the uploaded audio and WRITES the generated PDFs into the
# same volume the API serves, so it needs the directory to exist and be owned by
# `node` for exactly the reason the backend's does.
RUN mkdir -p /repo/apps/backend/uploads/summaries && chown -R node:node /repo/apps/backend/uploads
WORKDIR /repo/apps/worker
USER node
# Only the backend migrates: Prisma serializes on an advisory lock anyway, and
# in practice the worker only ever acts on a job the backend already enqueued.
CMD ["npm", "start"]
