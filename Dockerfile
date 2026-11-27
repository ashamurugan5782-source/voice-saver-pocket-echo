# syntax=docker/dockerfile:1

# Voice Seva — electricity bill voice assistant (Tamil + English)
# Build:  docker build -t voice-seva .
# Run:    docker run -p 8080:8080 -e LOVABLE_API_KEY=... voice-seva

# ---------- 1. install dependencies ----------
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Lockfile first so this layer is reused when only source code changes.
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# ---------- 2. build the app ----------
FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The project normally builds for Lovable's edge hosting. Inside a container we
# want a plain Node server instead, so nitro emits .output/server/index.mjs.
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production
RUN bun run build

# ---------- 3. run it ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
