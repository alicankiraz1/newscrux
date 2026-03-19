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

RUN mkdir -p /app/data && chown node:node /app/data

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist/ dist/

USER node

ENTRYPOINT ["node", "dist/index.js"]
CMD ["--lang=en"]
