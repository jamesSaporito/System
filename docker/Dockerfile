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
# Compose starts Postgres itself; this makes @portfolio/db's db:up a no-op in here.
ENV DEV_CONTAINER=1
# Pre-create mount points owned by `node` so named volumes inherit that ownership.
RUN mkdir -p node_modules apps/admin/node_modules apps/admin/.next apps/backend/node_modules \
      sites/james/node_modules sites/james/.next \
      packages/ui/node_modules packages/config/node_modules packages/contracts/node_modules \
      packages/db/node_modules packages/media/node_modules /home/node/.local/share/pnpm \
    && chown -R node:node /app /home/node/.local
USER node
EXPOSE 3000 3001 4000
# docker-compose.yml overrides this per service.
CMD ["sh", "-c", "pnpm install --frozen-lockfile && pnpm dev"]

# --- build: produce one site's static export (docker compose passes SITE)
FROM base AS build
ARG SITE=james
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile
# Turbo run from an app's folder builds just that app and its dependencies.
RUN cd "sites/$SITE" && pnpm turbo run build

# --- preview: serve the export with nginx, mimicking CloudFront
FROM nginxinc/nginx-unprivileged:1.30-alpine AS preview
ARG SITE=james
# The image renders templates/*.template into conf.d at start, substituting $SITE.
ENV SITE=${SITE}
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/sites/${SITE}/out /usr/share/nginx/html
EXPOSE 8080
