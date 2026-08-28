# Build context is the repo root (needs the npm workspace packages).
FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .
RUN npm ci
RUN npx turbo run build --filter=worker...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
# ffmpeg is not optional here: the worker re-encodes every audio to 16 kHz mono
# before sending it to the transcription API, which is what makes a long
# recording fit under the endpoint's 25 MB limit. Without it the worker still
# runs (it falls back to the original file), but anything long starts failing.
RUN apk add --no-cache ffmpeg
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
