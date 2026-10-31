---
name: convert-media
description: Converts new or changed photos in apps/portfolio/media-originals/ into web-ready WebP copies in apps/portfolio/media/ (about 2200px wide, quality 80, metadata stripped). Use when photos have been added to media-originals, or when the user types /convert-media (optionally with a folder such as "leather").
---

# Convert media originals to WebP

Originals live in gitignored `apps/portfolio/media-originals/<folder>/`, and web-ready copies go to the same relative path under `apps/portfolio/media/` with a `.webp` extension (e.g. `media-originals/leather/bag1.jpeg` → `media/leather/bag1.webp`). See the photos section of `README.md`.

## 1. Check the tools

```sh
cwebp -version && gif2webp -version
```

Both are in the dev container (`libwebp-tools` in `docker/Dockerfile`); if they aren't on the current machine, run steps 2–3 there with `docker compose exec -T -w /app portfolio sh -c '…'` (Alpine: `sh`, not `bash`). On a Mac they come from the `webp` Homebrew formula. If neither works, stop and ask the user to run `brew install webp`; don't install anything else or use a different converter.

## 2. Find what needs converting

Run from the repo root. If the user named a folder, limit the search to it. A file needs converting when its `.webp` copy is missing or older than the original:

```sh
find apps/portfolio/media-originals -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.gif' \) | sort | while IFS= read -r src; do
  dst=$(printf %s "$src" | sed 's#/media-originals/#/media/#; s#\.[^.]*$#.webp#')
  # The -e check matters in busybox sh, where -nt is false when $dst doesn't exist.
  if [ ! -e "$dst" ] || [ "$src" -nt "$dst" ]; then echo "$src -> $dst"; fi
done
```

If nothing is listed, say so and stop. Report files with other extensions (e.g. `.heic`, `.mov`) as skipped instead of converting them.

## 3. Convert

For each file, create the destination folder (`mkdir -p`), then:

- JPEG/PNG: `cwebp -q 80 -resize 2200 0 -metadata none "$src" -o "$dst"`
- GIF: `gif2webp -q 80 -metadata none "$src" -o "$dst"` (`gif2webp` can't resize)

Never modify or delete anything in `media-originals/`. Only overwrite an existing `.webp` when step 2 listed it.

## 4. Report

List each converted file with its new size (`ls -lh`), and any failures or skipped files. Remind the user that `pnpm media:push` (from `apps/portfolio`) uploads the new copies to the local bucket (inside the dev container add `-e S3_ENDPOINT=http://s3mock:9090`, since its default `localhost:9090` only works from the Mac), and `pnpm media:push:prod` with `AWS_PROFILE` set uploads to production. Don't run either unless asked.
