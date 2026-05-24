FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY migrations ./migrations

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health/live || exit 1

CMD ["node", "dist/index.js"]

# ── Development image (hot-reload) ────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app
ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

EXPOSE 3001
CMD ["npm", "run", "dev"]
