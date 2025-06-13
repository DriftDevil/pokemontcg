
# Dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

ENV NODE_ENV production

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
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static


# Set the user for the production image
USER nextjs

EXPOSE ${PORT}

ENTRYPOINT ["node"]
CMD ["server.js"]
