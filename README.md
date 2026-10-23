# Portfolio

Personal portfolio site: a fully static Next.js export, hosted on S3 + CloudFront, with a NestJS backend (PostgreSQL via Prisma) that will power a CMS.

## Layout

```
apps/public         Next.js site (static export)
apps/backend        NestJS API (bundled with tsdown)
packages/db         Prisma schema, migrations, and client
packages/contracts  Zod schemas and types shared by apps
packages/ui         Shared React components
packages/config     Shared tsconfig, oxlint, and Prettier presets
content/            MDX content (see content/README.md)
infra/              Terraform (planned)
docker/             Dockerfile and nginx preview config
```

## Prerequisites

- Node 24.22.0 (`nvm use`) with Corepack enabled (`corepack enable pnpm`), **or**
- Docker

## Native

Postgres and the S3 stand-in still run in Docker:

```sh
cp .env.example .env
pnpm install
pnpm services:up  # Postgres on :5432, s3mock on :9090
pnpm db:migrate   # apply migrations (and create new ones after schema changes)
pnpm dev          # public on http://localhost:3000, backend on http://localhost:4000
pnpm build        # static export to apps/public/out, backend bundle to apps/backend/dist
pnpm preview      # build, then serve apps/public/out on http://localhost:3000
pnpm db:studio    # browse the database
pnpm lint
pnpm typecheck
pnpm format
```

## Docker

```sh
pnpm dev:docker       # everything with hot reload: public :3000, backend :4000
pnpm preview:docker   # production build via nginx, http://localhost:8080
```

These wrap `docker compose up --build` and `docker compose --profile preview up --build preview`.

The `install` service runs `pnpm install` once before the app services start, and `backend` applies pending migrations on start. After changing dependencies, rerun `pnpm dev:docker`. To reset container installs and data: `docker compose down -v`.

The preview service mirrors CloudFront: clean URLs resolve to `index.html` and unknown paths return `404.html`.

Media uploads use [s3mock](https://github.com/adobe/S3Mock) as a local S3 stand-in (bucket `media`).
