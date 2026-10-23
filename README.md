# Portfolio

Personal portfolio site: a fully static Next.js export, hosted on S3 + CloudFront, with a NestJS backend (PostgreSQL via Prisma) and an admin app that will power a CMS.

## Layout

```
apps/public         Next.js site (static export)
apps/admin          Next.js admin UI (static export, GitHub sign-in)
apps/backend        NestJS API + Better Auth (bundled with tsdown)
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

## Setup

```sh
cp .env.example .env
```

Then fill in `.env`:

- `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: create a GitHub OAuth app (Settings → Developer settings → OAuth Apps) with homepage `http://localhost:3001` and callback URL `http://localhost:4000/api/auth/callback/github`.
- `ADMIN_GITHUB_IDS`: your numeric GitHub user ID (the `id` field at `https://api.github.com/users/<username>`). Only these accounts can sign in to the admin.

## Docker (recommended)

One command starts everything: Postgres, s3mock, the backend (after applying migrations), admin, and public, all with hot reload.

```sh
pnpm dev:docker       # public :3000, admin :3001, backend :4000
pnpm preview:docker   # production build via nginx, http://localhost:8080
```

These wrap `docker compose up --build` and `docker compose --profile preview up --build preview`.

The `install` service runs `pnpm install` once before the app services start. After changing dependencies, rerun `pnpm dev:docker`. To reset container installs and data: `docker compose down -v`.

The preview service mirrors CloudFront: clean URLs resolve to `index.html` and unknown paths return `404.html`.

## Native

Apps run on your machine; Postgres still runs in Docker and is started automatically by any task that needs it.

```sh
pnpm install
pnpm dev          # public :3000, admin :3001, backend :4000
pnpm build        # static export to apps/public/out, backend bundle to apps/backend/dist
pnpm preview      # build, then serve public :3000 and admin :3001
pnpm test         # backend tests against the local database
pnpm db:migrate   # create a migration after editing packages/db/prisma/schema.prisma
pnpm db:studio    # browse the database
pnpm lint
pnpm typecheck
pnpm format
```

Task ordering lives in `turbo.json`: `@portfolio/db` owns `db:up` (start Postgres) and `db:deploy` (apply migrations), and the backend's `dev` and `test` depend on them. Run `turbo` from inside a package folder to scope it to that package.

Media uploads use [s3mock](https://github.com/adobe/S3Mock) as a local S3 stand-in (bucket `media`).
