# To do

## Before pushing

## Later
- Write the `/time/` overview intro (`apps/portfolio/app/time/page.draft.tsx`), then publish it: rename to `page.tsx` and drop `draft: true` from Overview in `lib/nav.ts`
- Make the Leather page (`apps/portfolio/app/leather/page.draft.tsx`) look presentable and nice: none of the photos are landscape, and the hero doesn't work with a portrait photo. Then publish it: rename to `page.tsx` and drop `draft: true` from Leather in `lib/nav.ts`
- Daily security news on the private admin page (from a claude-configuration session; the `security-news` skill stays there too)
  - Same search and brief as the skill: `~/Projects/claude-configuration/skills/security-news/SKILL.md`, layout in `assets/template.md`
  - Storage is done: `security_briefs` / `security_brief_items` in `packages/db`, validated by `securityBriefInputSchema` in `@portfolio/contracts`
  - Backend and job are done and run inside the backend (`packages/security-news`, README "Daily security brief"): `GET /security-briefs` and `/:runOn` (the `SECURITY` tab permission), admin-only `POST /security-briefs/run`, and a 12:00 UTC schedule when `SECURITY_NEWS_SCHEDULE=true`
  - Live runs work: about $1.66 a run with prompt caching (was about $5.93 without). Still to do: compare a brief with what the skill writes for the same day
  - Replace the pasted `SKILL.md` text in `packages/security-news/src/prompt.ts` with the real file if they differ (the layout is in `src/template.ts`)
  - Deploying the backend: it needs internet egress (GitHub OAuth, the GitHub user lookup and the Anthropic API; the planned VPC has none today), `ANTHROPIC_API_KEY` as a secret, `SECURITY_NEWS_SCHEDULE=true`, and a single instance (or a database lock before running more)
  - The admin's Vulnerability Report tab shows the briefs by date, and admins edit its sources at `/vulnerability-report/sources/`. Still to add: a "Run now" button for admins (`POST /security-briefs/run`), and iterate on the layout
  - Not yet run against the real API since the sources, "nothing new" and the subject/impact renames: do a live run (asks first, about $1.66), ideally once with the toggle off
  - The admin page is meant as a personal display of things I want to see
