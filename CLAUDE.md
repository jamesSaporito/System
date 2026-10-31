# CLAUDE.md

## Constraints

- **One portfolio, one personal admin**: `apps/portfolio` is the portfolio site (jamessaporito.com), a Next.js static export whose text is written in code. `apps/admin` and `apps/backend` are a private, members-only personal admin, and the place for future admin features. Admins (`ADMIN_GITHUB_IDS`) manage members; admin-only backend routes declare `@RequireAdmin()`.
- Photos are never committed: originals stay in gitignored `apps/portfolio/media-originals/`, and web-ready WebP copies (~2200px, `cwebp -q 80 -metadata none`) live in gitignored `apps/portfolio/media/`, sync to the `media/` prefix of the site's bucket with `pnpm media:push` / `media:pull` (`packages/media`), and are referenced via `mediaUrl()` from `apps/portfolio/lib/media.ts`. Don't put photos in `public/`; small committed design assets (logo, favicon) are the exception.
- Uploading photos to production is part of every git push, not a TODO item: before pushing, run `pnpm media:push:prod` from `apps/portfolio` (if its photos changed) with `AWS_PROFILE` set (it only uploads new or changed files, and drafts' photos going up early is harmless). Where AWS credentials aren't available (e.g. the dev container), give the user that command to run on the Mac as part of the push step.
- `apps/portfolio` and `apps/admin` are **static exports only** (`output: "export"`, `trailingSlash: true`, `images.unoptimized`). Don't add anything needing a server at runtime: no route handlers, middleware, ISR, server actions, or `next/image` optimization. Dynamic routes need `generateStaticParams` and `dynamicParams = false`.
- Unpublished sections of the portfolio are drafts (`apps/portfolio/lib/drafts.ts`): nav items and Home tiles get `draft: true`, pages are named `page.draft.tsx`. They appear in `next dev` only; production builds omit them from the HTML, JavaScript, and routes entirely (never hide them with CSS). Filter drafts in server components only, and pass the result to client components as props.
- Any URL/404/`/media/` behavior change must be mirrored in `docker/nginx.conf.template` (which stands in for CloudFront).
- `apps/backend` (NestJS 12, ESM) is bundled by tsdown, which also compiles the internal TS-source packages into `dist/`. Its `.oxlintrc.json` disables `consistent-type-imports` because Nest DI needs runtime class imports: never convert injected classes to `import type`.
- The Prisma schema lives in `packages/db/prisma/schema.prisma`; the generated client (`packages/db/src/generated/`) is gitignored and produced by the `db:generate` turbo task. After schema changes run `pnpm db:migrate` and commit the migration. Database names are snake_case: every model gets a plural `@@map("table_names")`, every multi-word field a `@map("column_name")`, and enums `@@map` plus lowercase `@map` values. Avoid SQL reserved words (`user`, `order`, …) as names. Calendar dates with no time of day (run dates, publication dates) are `DateTime @db.Date`; write them as `new Date("YYYY-MM-DD")` and read them back with `toISOString().slice(0, 10)`.
- Production database (Aurora, `infra/`) is private with no laptop access by design. Production migrations run only as an automated one-off task inside AWS (in the VPC, with the database client security group) triggered by the deploy pipeline; never design a manual or laptop-run migration step.
- Auth: Better Auth (GitHub only) is mounted at `/api/auth/*` by `configureApp()` in `apps/backend/src/app.ts`, ahead of Nest's JSON body parser. The global `SessionGuard` requires a session from an admin or member on every route (opt out with `@AllowAnonymous()`) and enforces `@RequireAdmin()`. Sign-in is allowed for admins (`ADMIN_GITHUB_IDS`) and anyone in the `members` table (added by GitHub username in the admin), via `user.validateUserInfo` in `apps/backend/src/auth/auth.ts`. Request bodies are validated by Zod schemas from `@portfolio/contracts` via `@Body({ schema })`.
- Backend tests boot the real app with `createTestApp()` from `apps/backend/src/test/support.ts` (env overridden through the `ENV` provider, GitHub faked) and sign in through the real OAuth flow. Keep auth and access tests going over HTTP, not internal calls.
- `apps/admin` is client-rendered and talks to the backend with a cookie session (`lib/auth-client.ts`). Its page guard only redirects; the backend is the real access control.
- `pnpm dev:docker` must boot everything needed. Ordering is declared in `turbo.json`, not in scripts: packages own their tasks (e.g. `@portfolio/db` owns `db:up` → `db:deploy`) and dependents use `dependsOn`. Don't add `--filter` to scripts; root scripts are `turbo run <task>`, and Compose services run `turbo` from the app's folder (`working_dir`). `db:migrate` is the exception: it prompts, so it runs via `pnpm --dir` rather than Turbo.
- The dev container sets `DEV_CONTAINER=1`, which makes `db:up` and `media:up` no-ops there (Compose starts Postgres and s3mock).
- Turbo runs in strict env mode: add any env var a task reads to `passThroughEnv`/`globalPassThroughEnv` (or `env`) in `turbo.json`, and to `.env.example`.

## Stack

pnpm workspaces + Turborepo, TypeScript 7 (strict), oxlint (type-aware via `oxlint-tsgolint`), Prettier, Tailwind CSS v4. Node and pnpm are pinned in `.nvmrc` and `packageManager`; keep the Dockerfile's `NODE_VERSION` in sync.

pnpm enforces a minimum release age; pin a slightly older version rather than adding `minimumReleaseAgeExclude`.

## Conventions

- Packages are named `@portfolio/<name>`, pin exact dependency versions, and depend on each other via `workspace:*`.
- Internal packages ship TypeScript source (no build step); apps consume them via `transpilePackages`.
- Every workspace exposes `lint` and `typecheck` scripts (and `build`/`dev` if applicable) so root `turbo` tasks pick them up.
- Tailwind doesn't scan `node_modules` symlinks: add an `@source` in `apps/admin/app/globals.css` and `apps/portfolio/app/globals.css` for any new UI package.
- Run `pnpm lint && pnpm typecheck && pnpm build && pnpm test` before committing.

## Adding a workspace

1. Create `apps/<name>` or `packages/<name>` with a `package.json` named `@portfolio/<name>`.
2. Extend a preset: `tsconfig.json` from `@portfolio/config/tsconfig/*`, `.oxlintrc.json` from `packages/config/oxlint/*`.
3. Add `lint`/`typecheck` scripts. If it has its own `node_modules`, add a named volume for it in `docker-compose.yml` and pre-create the mount point in the `dev` stage of `docker/Dockerfile`.
