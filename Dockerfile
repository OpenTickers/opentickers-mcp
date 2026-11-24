FROM oven/bun:latest AS base
WORKDIR /app

# Cache dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy source
COPY src ./src
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=29473

EXPOSE 29473
CMD ["bun", "run", "src/index.ts"]
