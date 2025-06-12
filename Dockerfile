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
# It will NOT copy a root openapi.yaml to /app/openapi.yaml if it doesn't exist in the build context root
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV production
ENV PORT 9002

# Create a non-root user and group
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy necessary files from the builder stage
# /app/public in builder (which contains openapi.yaml) is copied to ./public in production
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
# The following line is removed as /app/openapi.yaml does not exist in the builder stage's root
# if openapi.yaml was removed from the project root.
# The openapi.yaml file is correctly served from the ./public directory.

# Set the user for the production image
USER nextjs

EXPOSE ${PORT}

CMD ["npm", "start"]
