# Stage 1: Install all dependencies (including dev for tsc)
FROM --platform=linux/amd64 node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build TypeScript
FROM --platform=linux/amd64 deps AS build
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

# Stage 3: Production runtime
FROM --platform=linux/amd64 node:22-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/data

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist/ dist/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--lang=en"]
