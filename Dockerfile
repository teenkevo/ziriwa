# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================

# IMPORTANT: Node.js and Nginxinc Image Version Maintenance
# This Dockerfile uses Node.js 24.13.0-slim and Nginxinc image with alpine3.22, which was the latest LTS version at the time of writing.
# To ensure security and compatibility, regularly validate and update the NODE_VERSION ARG and NGINXINC_IMAGE_TAG to the latest LTS versions.

ARG NODE_VERSION=24.13.0-slim
ARG NGINXINC_IMAGE_TAG=alpine3.22

FROM node:${NODE_VERSION} AS dependencies

# Set the working directory
WORKDIR /app

# Copy package-related files first to leverage Docker's caching mechanism
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

# Install project dependencies with frozen lockfile for reproducible builds
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
  if [ -f package-lock.json ]; then \
    npm ci --legacy-peer-deps --no-audit --no-fund; \
  elif [ -f yarn.lock ]; then \
    corepack enable yarn && yarn install --frozen-lockfile --production=false; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm install --frozen-lockfile; \
  else \
    echo "No lockfile found." && exit 1; \
  fi

# ============================================
# Stage 2: Build Next.js Application
# ============================================

FROM node:${NODE_VERSION} AS builder

# Set the working directory
WORKDIR /app

ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET
ARG NEXT_PUBLIC_APP_URL

# SANITY
ARG SANITY_PROJECT_ID
ARG SANITY_DATASET
ARG SANITY_API_TOKEN
ARG SANITY_API_READ_TOKEN
ARG SANITY_REVALIDATE_SECRET

# CLERK
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ARG CLERK_WEBHOOK_SIGNING_SECRET

# ENV
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID
ENV NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# SANITY
ENV SANITY_PROJECT_ID=$SANITY_PROJECT_ID
ENV SANITY_DATASET=$SANITY_DATASET
ENV SANITY_API_TOKEN=$SANITY_API_TOKEN
ENV SANITY_API_READ_TOKEN=$SANITY_API_READ_TOKEN
ENV SANITY_REVALIDATE_SECRET=$SANITY_REVALIDATE_SECRET

# CLERK
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV CLERK_WEBHOOK_SIGNING_SECRET=$CLERK_WEBHOOK_SIGNING_SECRET

# Copy project dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY . .

ENV NODE_ENV=production

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN --mount=type=cache,target=/app/.next/cache \
  if [ -f package-lock.json ]; then \
    npm run build; \
  elif [ -f yarn.lock ]; then \
    corepack enable yarn && yarn build; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm build; \
  else \
    echo "No lockfile found." && exit 1; \
  fi

# =========================================
# Stage 3: Serve Static Files with Nginx
# =========================================

FROM nginxinc/nginx-unprivileged:${NGINXINC_IMAGE_TAG} AS runner

# Set the working directory
WORKDIR /app

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the run time.
# ENV NEXT_TELEMETRY_DISABLED=1

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the static build output from the build stage to Nginx's default HTML serving directory
COPY --from=builder /app/out /usr/share/nginx/html

# Non-root user for security best practices
USER nginx

# Expose port 8080 to allow HTTP traffic
EXPOSE 8080

# Start Nginx directly with custom config
ENTRYPOINT ["nginx", "-c", "/etc/nginx/nginx.conf"]
CMD ["-g", "daemon off;"]