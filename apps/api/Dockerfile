# ============================================
# HRIS API - Multi-stage Docker Build
# ============================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for API
COPY apps/api/package.json apps/api/package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install --legacy-peer-deps

# Copy API source
COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src

# Build TypeScript (skip type checking, transpile only)
RUN npx tsc --noCheck

# --- Stage 2: Production ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production deps only
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]
