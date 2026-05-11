# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY apps/web/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY apps/web/ .

# Build argument for API URL
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Build Vite app
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine AS runner

# Copy custom nginx config for SPA routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
