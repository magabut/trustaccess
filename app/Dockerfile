# syntax=docker/dockerfile:1

# ---- Builder stage: install deps and build the Next.js app ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies from the lockfile first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the application (source is copied last so it can change without reinstalling deps).
COPY . .
RUN npm run build

# ---- Runner stage: production runtime only, non-root ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Install production dependencies only (no dev deps, no .env).
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

# Built Next.js output and static assets.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Config files required by `next start`.
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/eslint.config.mjs ./eslint.config.mjs
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs

# Migrations + CLI entrypoint (runs `npm run migrate` at startup). No seed data.
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "npm run migrate && npm run start"]
