# syntax=docker/dockerfile:1
# Nông trại vui vẻ — Fastify + better-sqlite3 + static frontend, một container.
FROM node:22-slim
WORKDIR /app

COPY package.json package-lock.json ./

# better-sqlite3 có prebuilt binary cho linux/arm64 + Node 22 (glibc); toolchain
# chỉ là fallback hiếm khi cần, cài và gỡ trong cùng MỘT layer để image sạch.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/src ./server/src
COPY public ./public

ENV NODE_ENV=production \
    PORT=8090 \
    DATA_DIR=/data

RUN mkdir -p /data && chown -R node:node /app /data

EXPOSE 8090
USER node
CMD ["node", "server/src/server.js"]
