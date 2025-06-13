# Dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; fi

# Copy the rest of the application code
# This will copy public/openapi.yaml to /app/public/openapi.yaml
COPY . .

# Build the Next.js application
# This will generate the .next/standalone directory if output: 'standalone' is in next.config.ts
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV production
ENV PORT 9002

# Create a non-root user and group
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy necessary files from the builder stage for standalone output
# The .next/standalone directory includes server.js, a minimal package.json, and necessary node_modules.
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
# Copy public assets
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
# Copy static assets from .next/static (required by the standalone server)
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Set the user for the production image
USER nextjs

EXPOSE ${PORT}

# The CMD for standalone output is 'node server.js'
# server.js is located in the root of the WORKDIR (/app) after copying from .next/standalone
CMD ["node", "server.js"]
