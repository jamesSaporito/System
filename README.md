# Portfolio

Multi-site portfolios. Each portfolio (`sites/<slug>`) is its own static Next.js export on its own domain (S3 + CloudFront), with its text in code and its photos in S3. A shared NestJS backend (PostgreSQL via Prisma) and admin app handle sign-in, sites and members, and are the base for future admin features.

## Layout

```
sites/<slug>        One Next.js app per portfolio (static export, own domain and design)
apps/admin          Shared admin UI for all sites (static export, GitHub sign-in)
apps/backend        Shared NestJS API + Better Auth (bundled with tsdown)
packages/db         Prisma schema, migrations, and client
packages/contracts  Zod schemas and types shared by apps
packages/media      `portfolio-media` CLI that syncs site photos with S3
packages/ui         Shared React components
packages/config     Shared tsconfig, oxlint, and Prettier presets
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
- `ADMIN_GITHUB_IDS`: your numeric GitHub user ID (the `id` field at `https://api.github.com/users/<username>`). These are platform admins; everyone else signs in by invitation to a site.

## Docker (recommended)

One command starts everything: Postgres, s3mock, the backend (after applying migrations and seeding site `james`), admin, and every site app, all with hot reload.

```sh
pnpm dev:docker       # site-james :3000, admin :3001, backend :4000
pnpm preview:docker   # sites/james production build via nginx, http://localhost:8080 (SITE=<slug> for another)
```

These wrap `docker compose up --build` and `docker compose --profile preview up --build preview`.

The `install` service runs `pnpm install` once before the app services start. After changing dependencies, rerun `pnpm dev:docker`. To reset container installs and data: `docker compose down -v`.

The preview service mirrors CloudFront: clean URLs resolve to `index.html`, unknown paths return `404.html`, and `/media/` is served from the site's bucket in s3mock.

## Native

Apps run on your machine; Postgres and s3mock still run in Docker and are started automatically by any task that needs them.

```sh
pnpm install
pnpm dev          # site-james :3000, admin :3001, backend :4000
pnpm build        # static exports to sites/*/out and apps/admin/out, backend bundle to apps/backend/dist
pnpm preview      # build, then serve each site and the admin
pnpm test         # backend tests against the local database
pnpm db:migrate   # create a migration after editing packages/db/prisma/schema.prisma
pnpm db:studio    # browse the database
pnpm media:push   # upload new/changed photos from sites/*/media/ to S3
pnpm media:pull   # download photos missing locally
pnpm lint
pnpm typecheck
pnpm format
```

Task ordering lives in `turbo.json`: `@portfolio/db` owns `db:up` (start Postgres), `db:deploy` (apply migrations) and `db:seed`, and the backend's `dev` and `test` depend on them; each site's `media:up` starts s3mock before its `dev`. Run `turbo` from inside a package folder to scope it to that package.

## Content and photos

Each site's text and layout are code in `sites/<slug>` (for example `sites/james/app/motorcycle/page.tsx`); changes ship by committing and deploying.

Photos are kept out of git. Put originals in `sites/<slug>/media/` (gitignored), mirroring the URL structure, and reference them in code with `mediaUrl("motorcycle/hero.jpg")` from `@/lib/media`. `pnpm media:push` uploads new or changed files to the `media/` prefix of the site's bucket, and `pnpm media:pull` downloads anything you don't have locally (new machine, or after a teammate's push).

- Locally the bucket is `site-<slug>` in [s3mock](https://github.com/adobe/S3Mock), and `next dev` loads photos from it (`sites/<slug>/.env.development`).
- In production CloudFront serves them from the site's own domain at `/media/`. To sync with real S3, run with `S3_ENDPOINT=` (empty), `MEDIA_BUCKET=<bucket>`, and your AWS credentials or `AWS_PROFILE`.
- Run the commands from `sites/<slug>` to sync only that site.

## Sites and access

- **Platform admins** (`ADMIN_GITHUB_IDS`) create sites in the admin's Sites page and can manage every site.
- Each site has **owners** (manage the site and its members) and **editors** (a narrower role for future admin features). Owners invite people by GitHub username; an invite becomes a membership when that account first signs in. Removing someone from their last site signs them out and blocks future sign-ins.

### Adding a site

1. Create it in the admin (Sites page). Its slug must match the app folder.
2. Copy `sites/james` to `sites/<slug>`, rename the package to `@portfolio/site-<slug>`, and give it its own design.
3. Add a `site-<slug>` service to `docker-compose.yml` on the next free port (3002, …) with its `node_modules`/`.next` volumes, and pre-create those mount points in the Dockerfile `dev` stage.
4. Add `site-<slug>` to s3mock's `COM_ADOBE_TESTING_S3MOCK_STORE_INITIAL_BUCKETS` (comma-separated), and point its `.env.development` at `http://localhost:9090/site-<slug>/media`.
5. Hosting (its own bucket, CloudFront distribution and certificate) is configured per site in Terraform; see `infra/README.md`.
