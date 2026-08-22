# Build context is the repo root (needs the npm workspace packages).
FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .
RUN npm ci
# Next.js inlines NEXT_PUBLIC_* vars at BUILD time, not at container runtime —
# changing the API URL later means rebuilding this image, not restarting it.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npx turbo run build --filter=web...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo .
WORKDIR /repo/apps/web
USER node
EXPOSE 3000
CMD ["npm", "start"]
