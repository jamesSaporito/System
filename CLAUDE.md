# CLAUDE.md

## Constraints

- `apps/public` is a **static export only** (`output: "export"`, `trailingSlash: true`, `images.unoptimized`). Don't add anything needing a server at runtime: no route handlers, middleware, ISR, server actions, or `next/image` optimization. Dynamic routes need `generateStaticParams` and `dynamicParams = false`.
- Content is MDX in `/content`, read at build time via `apps/public/lib/content.ts`. Keep `content/README.md` in sync with the frontmatter validator.
- Any URL/404 behavior change must be mirrored in `docker/nginx.conf` (which stands in for CloudFront).
- `apps/backend` (NestJS 12, ESM) is bundled by tsdown, which also compiles the internal TS-source packages into `dist/`. Its `.oxlintrc.json` disables `consistent-type-imports` because Nest DI needs runtime class imports: never convert injected classes to `import type`.
- The Prisma schema lives in `packages/db/prisma/schema.prisma`; the generated client (`packages/db/src/generated/`) is gitignored and produced by the `db:generate` turbo task. After schema changes run `pnpm db:migrate` and commit the migration.
- Turbo runs in strict env mode: add any env var a task reads to `passThroughEnv` (or `env`) in `turbo.json`, and to `.env.example`.

## Stack

pnpm workspaces + Turborepo, TypeScript 7 (strict), oxlint (type-aware via `oxlint-tsgolint`), Prettier, Tailwind CSS v4. Node and pnpm are pinned in `.nvmrc` and `packageManager`; keep the Dockerfile's `NODE_VERSION` in sync.

pnpm enforces a minimum release age; pin a slightly older version rather than adding `minimumReleaseAgeExclude`.

## Conventions

- Packages are named `@portfolio/<name>`, pin exact dependency versions, and depend on each other via `workspace:*`.
- Internal packages ship TypeScript source (no build step); apps consume them via `transpilePackages`.
- Every workspace exposes `lint` and `typecheck` scripts (and `build`/`dev` if applicable) so root `turbo` tasks pick them up.
- Tailwind doesn't scan `node_modules` symlinks: add an `@source` in `apps/public/app/globals.css` for any new UI package.
- Run `pnpm lint && pnpm typecheck && pnpm build` before committing.

## Adding a workspace

1. Create `apps/<name>` or `packages/<name>` with a `package.json` named `@portfolio/<name>`.
2. Extend a preset: `tsconfig.json` from `@portfolio/config/tsconfig/*`, `.oxlintrc.json` from `packages/config/oxlint/*`.
3. Add `lint`/`typecheck` scripts. If it has its own `node_modules`, add a named volume for it in `docker-compose.yml` and pre-create the mount point in the `dev` stage of `docker/Dockerfile`.
