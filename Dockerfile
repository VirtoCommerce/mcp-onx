# Multi-stage build: MCP Server + VirtoCommerce Adapter
# Build context: repository root

# --- Stage 1: Build both packages ---
FROM node:22-alpine AS builder
WORKDIR /app

# Server: install deps & build
COPY server/package*.json server/
RUN cd server && npm ci

COPY server/tsconfig.json server/
COPY server/src/ server/src/
RUN cd server && npm run build

# VirtoCommerce adapter: install deps & build
# (depends on server via file:../server, so server must be present)
COPY virtocommerce-adapter/package*.json virtocommerce-adapter/
RUN cd virtocommerce-adapter && npm ci

COPY virtocommerce-adapter/tsconfig.json virtocommerce-adapter/
COPY virtocommerce-adapter/src/ virtocommerce-adapter/src/
RUN cd virtocommerce-adapter && npm run build

# --- Stage 2: Production deps only ---
FROM node:22-alpine AS prod-deps
WORKDIR /app

COPY server/package*.json server/
RUN cd server && npm ci --omit=dev

COPY virtocommerce-adapter/package*.json virtocommerce-adapter/
COPY --from=builder /app/server/ server/
RUN cd virtocommerce-adapter && npm ci --omit=dev

# --- Stage 3: Runtime ---
FROM node:22-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S cof -u 1001

WORKDIR /app

# Server
COPY --from=builder --chown=cof:nodejs /app/server/dist server/dist
COPY --from=prod-deps --chown=cof:nodejs /app/server/node_modules server/node_modules
COPY --chown=cof:nodejs server/package.json server/

# VirtoCommerce adapter
COPY --from=builder --chown=cof:nodejs /app/virtocommerce-adapter/dist virtocommerce-adapter/dist
COPY --from=prod-deps --chown=cof:nodejs /app/virtocommerce-adapter/node_modules virtocommerce-adapter/node_modules
COPY --chown=cof:nodejs virtocommerce-adapter/package.json virtocommerce-adapter/

RUN mkdir -p /app/logs && chown cof:nodejs /app/logs

USER cof

ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV ADAPTER_TYPE=local
ENV ADAPTER_PATH=/app/virtocommerce-adapter/dist/index.js
ENV MCP_TRANSPORT=sse
ENV MCP_PORT=3000

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

WORKDIR /app/server
CMD ["node", "dist/index.js"]
