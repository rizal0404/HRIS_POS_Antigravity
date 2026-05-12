# ============================================
# HRIS Web - Multi-stage Docker Build
# ============================================

# --- Stage 1: Build the Vite SPA ---
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build-time args
ARG VITE_API_URL=http://localhost:3001

# Set as env for vite build
ENV VITE_API_URL=$VITE_API_URL

# Copy root package files (frontend is at project root)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source files needed for build
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.cjs ./
COPY src ./src
COPY public ./public

# Build the SPA
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add custom nginx config for SPA routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
