# SUIKA FIGTHER on Railway: one Node process (accounts, rooms, WebSocket, the built game) + Chromium for the server-hosted matches (server/host.js)
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
# chromium = the headless match hosts; fonts so canvas text never falls back to nothing
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production CHROME_PATH=/usr/bin/chromium
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server ./server
CMD ["node", "server/index.js"]
