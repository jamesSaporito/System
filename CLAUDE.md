# CLAUDE.md

## Constraints

- **Multi-site, no CMS**: `sites/<slug>` holds one Next.js app per portfolio (own domain and design) whose text is written in code. `apps/admin` and `apps/backend` are shared by all sites (auth, sites, members) and are the place for future admin features; per-site backend routes live under `/sites/:siteId/...` and declare `@RequireSiteRole("EDITOR" | "OWNER")`.
- Photos are never committed: originals stay in gitignored `sites/<slug>/media-originals/`, and web-ready WebP copies (~2200px, `cwebp -q 80 -metadata none`) live in gitignored `sites/<slug>/media/`, sync to the `media/` prefix of the site's bucket with `pnpm media:push` / `media:pull` (`packages/media`), and are referenced via `mediaUrl()` from `sites/<slug>/lib/media.ts`. Don't put photos in `public/`; small committed design assets (logo, favicon) are the exception.
- `sites/*` and `apps/admin` are **static exports only** (`output: "export"`, `trailingSlash: true`, `images.unoptimized`). Don't add anything needing a server at runtime: no route handlers, middleware, ISR, server actions, or `next/image` optimization. Dynamic routes need `generateStaticParams` and `dynamicParams = false`.
- Unpublished sections are drafts (`sites/<slug>/lib/drafts.ts`): nav items and Home tiles get `draft: true`, pages are named `page.draft.tsx`. They appear in `next dev` only; production builds omit them from the HTML, JavaScript, and routes entirely (never hide them with CSS). Filter drafts in server components only, and pass the result to client components as props.
- Any URL/404/`/media/` behavior change must be mirrored in `docker/nginx.conf.template` (which stands in for CloudFront).
- `apps/backend` (NestJS 12, ESM) is bundled by tsdown, which also compiles the internal TS-source packages into `dist/`. Its `.oxlintrc.json` disables `consistent-type-imports` because Nest DI needs runtime class imports: never convert injected classes to `import type`.
- The Prisma schema lives in `packages/db/prisma/schema.prisma`; the generated client (`packages/db/src/generated/`) is gitignored and produced by the `db:generate` turbo task. After schema changes run `pnpm db:migrate` and commit the migration. Database names are snake_case: every model gets a plural `@@map("table_names")`, every multi-word field a `@map("column_name")`, and enums `@@map` plus lowercase `@map` values. Avoid SQL reserved words (`user`, `order`, …) as names.
- Production database (Aurora, `infra/`) is private with no laptop access by design. Production migrations run only as an automated one-off task inside AWS (in the VPC, with the database client security group) triggered by the deploy pipeline; never design a manual or laptop-run migration step.
- Auth: Better Auth (GitHub only) is mounted at `/api/auth/*` by `configureApp()` in `apps/backend/src/app.ts`, ahead of Nest's JSON body parser. The global `SessionGuard` requires a session on every route (opt out with `@AllowAnonymous()`) and enforces `@RequirePlatformAdmin()` / `@RequireSiteRole()`; non-members get 404 for a site. Sign-in is allowed for platform admins (`ADMIN_GITHUB_IDS`), pending invites, and current members, via `user.validateUserInfo` in `apps/backend/src/auth/auth.ts`. Request bodies are validated by Zod schemas from `@portfolio/contracts` via `@Body({ schema })`.
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
- Tailwind doesn't scan `node_modules` symlinks: add an `@source` in `apps/admin/app/globals.css` and every `sites/*/app/globals.css` for any new UI package.
- Run `pnpm lint && pnpm typecheck && pnpm build && pnpm test` before committing.

## Adding a workspace

1. Create `apps/<name>`, `packages/<name>` or `sites/<slug>` with a `package.json` named `@portfolio/<name>` (`@portfolio/site-<slug>` for sites).
2. Extend a preset: `tsconfig.json` from `@portfolio/config/tsconfig/*`, `.oxlintrc.json` from `packages/config/oxlint/*`.
3. Add `lint`/`typecheck` scripts. If it has its own `node_modules`, add a named volume for it in `docker-compose.yml` and pre-create the mount point in the `dev` stage of `docker/Dockerfile`.
