# ================================
# Stage 1: Install dependencies
# ================================
FROM node:18-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && \
    cp -R node_modules /prod_node_modules && \
    npm ci

# ================================
# Stage 2: Build the application
# ================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set Next.js telemetry to disabled during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# ================================
# Stage 3: Production runner
# ================================
FROM node:18-alpine AS runner

WORKDIR /app

# Set to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 3000

# Set hostname to listen on all interfaces
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
