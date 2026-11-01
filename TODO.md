# To do

## Before pushing

## Later

- Write the `/time/` overview intro (`apps/portfolio/app/time/page.draft.tsx`), then publish it: rename to `page.tsx` and drop `draft: true` from Overview in `lib/nav.ts`
- Make the Leather page (`apps/portfolio/app/leather/page.draft.tsx`) look presentable and nice: none of the photos are landscape, and the hero doesn't work with a portrait photo. Then publish it: rename to `page.tsx` and drop `draft: true` from Leather in `lib/nav.ts`
- Daily security news on the private admin page (from a claude-configuration session; the `security-news` skill stays there too)
  - Move tunables out of code (from the config review): the run hour is written twice (`@Cron` in `apps/backend/src/security-brief/security-brief.scheduler.ts` and `RUN_HOUR_UTC`), the model (`BRIEF_MODEL`), and the per-source cap `MAX_ENTRIES_PER_SOURCE` (an admin setting on `security_news_settings`)
  - The per-source cap drops entries for good, but `feeds.ts`'s header, `CLAUDE.md` and the README say nothing is dropped: change the docs or the cap
  - The Run now dialog still says "anything new since the last run", which isn't true with "Read the last 24 hours" ticked
  - Deploying the backend: it needs internet egress (GitHub OAuth, the GitHub user lookup, the feeds and the Anthropic API; the planned VPC has none today), `ANTHROPIC_API_KEY` as a secret, `SECURITY_NEWS_SCHEDULE=true`, and a single instance (or a database lock before running more)
  - Let the user move items they don't care about to another section (planned when the model stopped choosing what goes in)
  - A news roundup that stands alone keeps every CVE it mentions, so a later KEV entry for one of them updates the roundup's item rather than starting its own
  - An item updated on two days is listed only on the later one as an update (only the latest `updated_on` is kept)
  - The admin page is meant as a personal display of things I want to see
- Admin dashboard is empty. Ideas: today's security snapshot (the latest day's actively exploited items and counts), brief run health and API spend (`security_brief_runs`), a stack watchlist matched against brief subjects, Dependabot alerts (needs a GitHub token in the backend), deploy/site status, quick links
