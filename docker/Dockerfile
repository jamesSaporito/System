# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.22.0

FROM node:${NODE_VERSION}-alpine AS base
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1
# libc6-compat: glibc shim some native binaries expect on Alpine.
RUN apk add --no-cache libc6-compat
# Pre-install the pinned pnpm so the non-root user never downloads it at runtime.
COPY package.json /tmp/package.json
RUN corepack enable pnpm \
    && corepack install -g "$(node -p 'require("/tmp/package.json").packageManager')" \
    && pnpm --version \
    && chmod -R a+rX "$COREPACK_HOME" \
    && rm /tmp/package.json
WORKDIR /app

# --- dev: source is bind-mounted; node_modules live in named volumes (see docker-compose.yml)
FROM base AS dev
# Pre-create mount points owned by `node` so named volumes inherit that ownership.
RUN mkdir -p node_modules apps/public/node_modules apps/public/.next apps/backend/node_modules \
      packages/ui/node_modules packages/config/node_modules packages/contracts/node_modules \
      packages/db/node_modules /home/node/.local/share/pnpm \
    && chown -R node:node /app /home/node/.local
USER node
EXPOSE 3000 4000
# docker-compose.yml overrides this per service.
CMD ["sh", "-c", "pnpm install --frozen-lockfile && pnpm dev"]

# --- build: produce the static export
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile
RUN pnpm turbo run build --filter=@portfolio/public

# --- preview: serve the export with nginx, mimicking CloudFront
FROM nginxinc/nginx-unprivileged:1.30-alpine AS preview
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/public/out /usr/share/nginx/html
EXPOSE 8080
