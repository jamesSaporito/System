# Portfolio

My portfolio (`apps/portfolio`), a static Next.js export on jamessaporito.com (S3 + CloudFront) with its text in code and its photos in S3. Alongside it, a NestJS backend (PostgreSQL via Prisma) and a members-only admin app make up a private, personal admin, the base for future admin features.

## Layout

```
apps/portfolio      The portfolio site (static export, jamessaporito.com)
apps/admin          Personal admin UI for members (static export, GitHub sign-in)
apps/backend        NestJS API: thin adapters wiring the feature packages to HTTP (bundled with tsdown)
packages/access     Sign-in (Better Auth), permissions, members, health: logic and API shapes
packages/security-brief  The daily security brief: feeds, writing, storage, runner, API shapes
packages/ai         Reusable Anthropic API client (structured output, validation and retry)
packages/db         Prisma schema, migrations, and client
packages/media      `portfolio-media` CLI that syncs the portfolio photos with S3
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

`packages/security-brief` writes the daily security news brief that the admin's Vulnerability Report tab shows. Code decides everything except the wording, so the same feed entries always give the same items and none is dropped:

1. **Read.** The backend reads [CISA's KEV catalog](https://github.com/cisagov/kev-data) (vulnerabilities known to be exploited, from CISA's GitHub copy), GitHub's reviewed critical and high advisories (`api.github.com/advisories`, every page) and the security news RSS/Atom feeds listed under Vulnerability Report → Manage feeds (admins only). Each source adds at most 10 entries per run (`MAX_ENTRIES_PER_SOURCE` in `src/feeds/feeds.ts`): each feed's newest security articles, KEV's newest additions, and GitHub's critical advisories before high ones, newest first. The rest are skipped, not saved for later, which also bounds what a run catching up after a long gap costs. Each source is read from where its last successful read started, less an hour (`security_news_settings` for KEV and GitHub, `security_news_feeds.fetched_at` for each feed); a source's first read covers the last 24 hours. A source that fails keeps its place, so the next run catches up. The backend needs to reach `raw.githubusercontent.com`, `api.github.com` and each feed's host.
2. **Store.** Every entry is stored in `security_feed_entries`, once: it's unique by source and id (the CVE, the GHSA id, or the article's URL), so reading it again adds nothing. Entries wait there (`item_id` null) until they're written into an item, across failed runs too.
3. **Group.** Waiting KEV entries and advisories that share a CVE or GHSA id are one issue. An article joins the first issue whose CVE it mentions, otherwise it's an issue of its own. An issue that shares an id with an item already written is an update of that item.
4. **Write.** Claude Opus 5.5 writes only those issues' text (subject, title, exploitation, affected, fix, impact, and whether an entry says it's exploited in the wild), up to 40 issues per request, with structured output. Every issue must come back; a missing one gets one retry, then the run fails and its entries keep waiting. When nothing is waiting, the model isn't called.
5. **Fill in.** Code sets the rest: the section (in KEV or exploited → Actively Exploited; a GitHub advisory → Critical and High; news only → Worth Knowing), severity and CVSS from GitHub, dates, the links (one per entry), and for an update, the day and a note ("Added to CISA KEV", "New article: …"). An item is listed on the day it was first seen, and on the latest day it was updated, marked as an update.

Every run, including failed and nothing-new ones, is logged in `security_brief_runs` with what it cost, the new entries, items and updates it made, and the feeds that failed. The run fails, without calling the model, if neither KEV nor GitHub can be read.

The backend runs it, in the same process and against the same database (no separate job or Lambda):

- Set `ANTHROPIC_API_KEY` in `.env` to let an admin start a run with the **Run now** button on the Vulnerability Report page (it asks you to type `yes` first), which calls `POST /security-briefs/run` (admin session required). It returns `202` straight away, since a run can take minutes, and the outcome (counts and tokens used, which is what a run costs) is logged as one JSON line. A rerun only sends entries that weren't written yet, so one with nothing new costs nothing. `GET /security-briefs` lists the days with items, and `GET /security-briefs/:day` a day's items (the `SECURITY` tab permission).
- `GET /security-briefs/status` (admins only) says whether a run is going and how the last one ended (from `security_brief_runs`, with the reason if it failed). The page polls it while a run is going and shows the same, scheduled runs included.
- Set `SECURITY_NEWS_SCHEDULE=true` as well and the backend writes the brief by itself every day at 12:00 UTC, and at startup if that time has passed and today hasn't had a run that stored items or found nothing new (so a restart or deploy can't skip a day or repeat one; a failed run is tried again). It is off by default so a development stack never spends money; production sets it to `true`.
- It assumes a single always-on backend instance. With more than one, each would start the scheduled run, so add a database lock first.
