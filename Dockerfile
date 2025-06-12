# Stage 1: Build the application
FROM node:20 AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
# Ensure all necessary files for the build are copied
COPY . .

# Build the Next.js application
# Runtime environment variables (like API keys or APP_URL for runtime use)
# should be provided when running the container, not necessarily at build time,
# unless they are needed to bake values into the static build (e.g., via NEXT_PUBLIC_).
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV production

# Create a non-root user and group
RUN addgroup --system nextjs && adduser --system --ingroup nextjs nextjs

# Copy package.json and package-lock.json (or yarn.lock if used) from builder
COPY --from=builder /app/package.json /app/package-lock.json* ./

# Install production dependencies
RUN npm install --omit=dev

# Copy built assets from the builder stage
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/openapi.yaml ./openapi.yaml

# Change ownership of the app directory to the non-root user
USER nextjs

# Expose the port the app runs on.
# The PORT environment variable will be used by `next start`.
# Defaulting to 9002 as per your current setup for consistency.
EXPOSE 9002

# Start the Next.js application in production mode.
# `next start` respects the PORT environment variable.
CMD ["npm", "start"]
