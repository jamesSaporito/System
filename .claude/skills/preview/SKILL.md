---
name: preview
description: Builds the portfolio's production static export and serves it with nginx (standing in for CloudFront) at http://localhost:8080, detached, to see what it looks like in prod. Use when the user types /preview, or asks to boot, rebuild or open the production preview.
---

# Production preview

The `preview` Compose service (profile `preview`, `docker/Dockerfile` target `preview`) builds `apps/portfolio` as a static export and serves it with `docker/nginx.conf.template`: clean URLs, `404.html` for unknown paths, and `/media/` from the `portfolio` bucket in s3mock. See the preview section of `README.md`. It doesn't watch files, so every run rebuilds.

## 1. Check the port

The preview publishes port 8080. If a container outside this project already publishes it (`docker ps -a --format '{{.Names}}\t{{.Ports}}' | grep 8080`), stop and tell the user which one; don't stop or reconfigure it.

## 2. Build and start

From the repo root, allowing up to 10 minutes:

```sh
docker compose --profile preview up --build --detach preview
```

Use `--detach` (`pnpm preview:docker` runs attached and would block). If the build fails, show the error.

## 3. Check it

Request every published page, and report anything that isn't a 200:

```sh
find apps/portfolio/app -name page.tsx | sed 's#^apps/portfolio/app##; s#page\.tsx$##' | sort | while IFS= read -r route; do
  curl -s -o /dev/null -w "%{http_code} $route\n" "http://localhost:8080$route"
done
```

A 404 on `/media/...` usually means the photos aren't in s3mock yet (`pnpm media:push` from `apps/portfolio`; inside the dev container add `-e S3_ENDPOINT=http://s3mock:9090`).

## 4. Report

Give the URL, http://localhost:8080. When running in portable, say whether 8080 is in `$PORTABLE_PORTS` (if it isn't, the preview only opens in here; suggest adding it to `PORTABLE_PORTS` in portable's `.env`). List the draft pages (`page.draft.tsx`) that are missing from the preview because production builds leave drafts out, and remind the user to run `/preview` again after changes.
