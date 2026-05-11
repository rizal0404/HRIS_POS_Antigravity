# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY apps/api/package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY apps/api/ .

# Build TypeScript
RUN npx tsc --project tsconfig.json

# ---- Production Stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY apps/api/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy drizzle config (needed for push migrations)
COPY apps/api/drizzle.config.ts ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
