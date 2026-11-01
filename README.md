# Portfolio

My portfolio (`apps/portfolio`), a static Next.js export on jamessaporito.com (S3 + CloudFront) with its text in code and its photos in S3. Alongside it, a NestJS backend (PostgreSQL via Prisma) and a members-only admin app make up a private, personal admin, the base for future admin features.

## Layout

```
apps/portfolio      The portfolio site (static export, jamessaporito.com)
apps/admin          Personal admin UI for members (static export, GitHub sign-in)
apps/backend        NestJS API + Better Auth (bundled with tsdown)
packages/db         Prisma schema, migrations, and client
packages/contracts  Zod schemas and types shared by apps
packages/media      `portfolio-media` CLI that syncs the portfolio photos with S3
packages/security-news  Writes the daily security brief with the Anthropic API (run by the backend)
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

One command starts everything: Postgres, s3, the backend (after applying migrations), admin, and the portfolio, all with hot reload.

```sh
pnpm dev:docker       # portfolio :3000, admin :3001, backend :4000
pnpm preview:docker   # portfolio production build via nginx, http://localhost:8080
```

These wrap `docker compose up --build` and `docker compose --profile preview up --build preview`.

The `install` service runs `pnpm install` once before the app services start. After changing dependencies, rerun `pnpm dev:docker`. To reset container installs and data: `docker compose down -v`.

The preview service mirrors CloudFront: clean URLs resolve to `index.html`, unknown paths return `404.html`, and `/media/` is served from the site's bucket in s3.

## Native

Apps run on your machine; Postgres and s3 still run in Docker and are started automatically by any task that needs them.

```sh
pnpm install
pnpm dev          # portfolio :3000, admin :3001, backend :4000
pnpm build        # static exports to apps/portfolio/out and apps/admin/out, backend bundle to apps/backend/dist
pnpm preview      # build, then serve each site and the admin
pnpm test         # backend tests against the local database
pnpm db:migrate   # create a migration after editing packages/db/prisma/schema.prisma
pnpm media:push   # upload new/changed photos from apps/portfolio/media/ to S3
pnpm media:pull   # download photos missing locally
pnpm lint
pnpm typecheck
pnpm format
```

Task ordering lives in `turbo.json`: `@portfolio/db` owns `db:up` (start Postgres), `db:deploy` (apply migrations), and the backend's `dev` and `test` depend on them; the portfolio's `media:up` starts s3 before its `dev`. Run `turbo` from inside a package folder to scope it to that package.

To browse the local database (e.g. in TablePlus), connect to `postgresql://portfolio:portfolio@localhost:5432/portfolio` (host `localhost`, port `5432`, user and password `portfolio`, database `portfolio`) while Postgres is running.

## Content and photos

The portfolio's text and layout are code in `apps/portfolio` (for example `apps/portfolio/app/motorcycle/page.tsx`); changes ship by committing and deploying.

Photos are kept out of git. Keep full-size originals in `apps/portfolio/media-originals/` and put web-ready copies in `apps/portfolio/media/` (both gitignored), one folder per page, and reference them in code with `mediaUrl("motorcycle/hero.webp")` from `@/lib/media`. To make a web-ready copy (about 2200px wide WebP, metadata stripped; `cwebp` is in the dev container, or `brew install webp` on a Mac):

```sh
cwebp -q 80 -resize 2200 0 -metadata none media-originals/motorcycle/hero.jpeg -o media/motorcycle/hero.webp
```

`pnpm media:push` uploads new or changed files to the `media/` prefix of the site's bucket, and `pnpm media:pull` downloads anything you don't have locally (new machine, or after a teammate's push).

- Locally the bucket is `portfolio` in [SeaweedFS](https://github.com/seaweedfs/seaweedfs), and `next dev` loads photos from it (`apps/portfolio/.env.development`).
- In production CloudFront serves them from the site's own domain at `/media/`. To upload to production, run `pnpm media:push:prod` from `apps/portfolio` with `AWS_PROFILE` set; it sets `S3_ENDPOINT=` (empty, meaning real AWS) and `MEDIA_BUCKET` to the site's bucket. Deploys never touch `media/`, so photos can go up before or after a deploy.

## Admin access

- **Admins** (`ADMIN_GITHUB_IDS`) can always sign in, hold every permission, and add or remove members and choose which tabs each can open on the admin's Members page.
- **Members** are added by GitHub username and can sign in from then on, whether or not they've signed in before. New members start with the Dashboard tab; an admin can pick a preset (no access, viewer, full access) or tick tabs individually, and changes apply on their next request. Removing a member signs them out and blocks future sign-ins.

## Daily security brief

`packages/security-news` writes the daily security news brief that the admin's Vulnerability Report tab shows. It is the `security-news` skill's instructions run through the Anthropic API instead of Claude Code: Claude Opus 5.5 searches the web and opens articles with Anthropic's server-side web search and fetch tools, writes the brief in the skill's layout, and a second, small request turns it into the data stored in `security_briefs`. It stores nothing if web search returned nothing, if the brief links a page the research never saw, or if nothing is new since the previous brief.

Which sites it uses is set in the admin, under Vulnerability Report → Manage sources (admins only): a list of site URLs it searches and reads first, and a toggle for whether it may also use other sites (vendor advisories, CVE records, other news). With the toggle off, web search and fetch are limited to the listed sites' domains. Every run, including failed and nothing-new ones, is logged with what it used in `security_brief_runs`.

The backend runs it, in the same process and against the same database (no separate job or Lambda):

- Set `ANTHROPIC_API_KEY` in `.env` to let an admin start a run: `POST /security-briefs/run` (admin session required). It returns `202` straight away, since a run takes minutes; the brief appears in `GET /security-briefs` when it is stored, and the outcome (items, tokens and searches used, which is what a run costs) is logged as one JSON line. A rerun on the same day replaces that day's brief.
- To run it from a terminal instead (no session needed), with the stack up: `pnpm security-brief:docker`. It waits for the run, logs the same JSON line, and exits non-zero unless it stored a brief or found nothing new.
- Set `SECURITY_NEWS_SCHEDULE=true` as well and the backend writes the brief by itself every day at 12:00 UTC, and at startup if that time has passed and today hasn't had a run that stored a brief or found nothing new (so a restart or deploy can't skip a day or repeat one; a failed run is tried again). It is off by default so a development stack never spends money; production sets it to `true`.
- It assumes a single always-on backend instance. With more than one, each would start the scheduled run, so add a database lock first.
