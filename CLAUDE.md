# CLAUDE.md

## Constraints

- `apps/public` and `apps/admin` are **static exports only** (`output: "export"`, `trailingSlash: true`, `images.unoptimized`). Don't add anything needing a server at runtime: no route handlers, middleware, ISR, server actions, or `next/image` optimization. Dynamic routes need `generateStaticParams` and `dynamicParams = false`.
- Content is MDX in `/content`, read at build time via `apps/public/lib/content.ts`. Keep `content/README.md` in sync with the frontmatter validator.
- Any URL/404 behavior change must be mirrored in `docker/nginx.conf` (which stands in for CloudFront).
- `apps/backend` (NestJS 12, ESM) is bundled by tsdown, which also compiles the internal TS-source packages into `dist/`. Its `.oxlintrc.json` disables `consistent-type-imports` because Nest DI needs runtime class imports: never convert injected classes to `import type`.
- The Prisma schema lives in `packages/db/prisma/schema.prisma`; the generated client (`packages/db/src/generated/`) is gitignored and produced by the `db:generate` turbo task. After schema changes run `pnpm db:migrate` and commit the migration. Database names are snake_case: every model gets a plural `@@map("table_names")`, every multi-word field a `@map("column_name")`, and enums `@@map` plus lowercase `@map` values. Avoid SQL reserved words (`user`, `order`, …) as names.
- Auth: Better Auth (GitHub only) is mounted at `/api/auth/*` in `apps/backend/src/main.ts`, ahead of Nest's JSON body parser. A global `SessionGuard` requires an admin session on every route; mark public routes `@AllowAnonymous()`. Sign-in is limited to `ADMIN_GITHUB_IDS` by Better Auth's `user.validateUserInfo` in `apps/backend/src/auth/auth.ts` (it sees the raw GitHub profile on sign-up and every sign-in). `auth.test.ts` drives the real OAuth callback with GitHub's API faked; keep auth tests going through `auth.handler`, not internal adapter calls.
- `apps/admin` is client-rendered and talks to the backend with a cookie session (`lib/auth-client.ts`). Its page guard only redirects; the backend is the real access control.
- `pnpm dev:docker` must boot everything needed. Ordering is declared in `turbo.json`, not in scripts: packages own their tasks (e.g. `@portfolio/db` owns `db:up` → `db:deploy`) and dependents use `dependsOn`. Don't add `--filter` to scripts; root scripts are `turbo run <task>`, and Compose services run `turbo` from the app's folder (`working_dir`). `db:migrate` is the exception: it prompts, so it runs via `pnpm --dir` rather than Turbo.
- The dev container sets `DEV_CONTAINER=1`, which makes `db:up` a no-op there (Compose starts Postgres).
- Turbo runs in strict env mode: add any env var a task reads to `passThroughEnv`/`globalPassThroughEnv` (or `env`) in `turbo.json`, and to `.env.example`.

## Stack

pnpm workspaces + Turborepo, TypeScript 7 (strict), oxlint (type-aware via `oxlint-tsgolint`), Prettier, Tailwind CSS v4. Node and pnpm are pinned in `.nvmrc` and `packageManager`; keep the Dockerfile's `NODE_VERSION` in sync.

pnpm enforces a minimum release age; pin a slightly older version rather than adding `minimumReleaseAgeExclude`.

## Conventions

- Packages are named `@portfolio/<name>`, pin exact dependency versions, and depend on each other via `workspace:*`.
- Internal packages ship TypeScript source (no build step); apps consume them via `transpilePackages`.
- Every workspace exposes `lint` and `typecheck` scripts (and `build`/`dev` if applicable) so root `turbo` tasks pick them up.
- Tailwind doesn't scan `node_modules` symlinks: add an `@source` in `apps/public/app/globals.css` and `apps/admin/app/globals.css` for any new UI package.
- Run `pnpm lint && pnpm typecheck && pnpm build && pnpm test` before committing.

## Adding a workspace

1. Create `apps/<name>` or `packages/<name>` with a `package.json` named `@portfolio/<name>`.
2. Extend a preset: `tsconfig.json` from `@portfolio/config/tsconfig/*`, `.oxlintrc.json` from `packages/config/oxlint/*`.
3. Add `lint`/`typecheck` scripts. If it has its own `node_modules`, add a named volume for it in `docker-compose.yml` and pre-create the mount point in the `dev` stage of `docker/Dockerfile`.
