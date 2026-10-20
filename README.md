# Portfolio

Personal portfolio site: a fully static Next.js export, hosted on S3 + CloudFront.

## Layout

```
apps/web          Next.js site (static export)
packages/ui       Shared React components
packages/config   Shared tsconfig, oxlint, and Prettier presets
content/          MDX content (see content/README.md)
infra/            Terraform (planned)
docker/           Dockerfile and nginx preview config
```

## Prerequisites

- Node 24.22.0 (`nvm use`) with Corepack enabled (`corepack enable pnpm`), **or**
- Docker

## Native

```sh
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # static export to apps/web/out
pnpm preview      # build, then serve apps/web/out on http://localhost:3000
pnpm lint
pnpm typecheck
pnpm format
```

## Docker

```sh
pnpm dev:docker       # dev server with hot reload, http://localhost:3000
pnpm preview:docker   # production build via nginx, http://localhost:8080
```

These wrap `docker compose up --build web` and `docker compose --profile preview up --build preview`.

The preview service mirrors CloudFront: clean URLs resolve to `index.html` and unknown paths return `404.html`.

After changing dependencies, restart `web` (it runs `pnpm install` on start). To reset container installs: `docker compose down -v`.
