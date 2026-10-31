# To do

## Before pushing

- In GitHub repo variables, add `PORTFOLIO_BUCKET` and `PORTFOLIO_DISTRIBUTION_ID` (same values as `SITE_JAMES_BUCKET` / `SITE_JAMES_DISTRIBUTION_ID`), then delete the old two; the deploy workflow now reads the new names
- Check that the `infra.yml` plan only shows `module.site_james` moved to `module.portfolio` (no destroy/create)

## Later

- Write the `/time/` overview intro (`apps/portfolio/app/time/page.draft.tsx`), then publish it: rename to `page.tsx` and drop `draft: true` from Overview in `lib/nav.ts`
- Make the Leather page (`apps/portfolio/app/leather/page.draft.tsx`) look presentable and nice: none of the photos are landscape, and the hero doesn't work with a portrait photo. Then publish it: rename to `page.tsx` and drop `draft: true` from Leather in `lib/nav.ts`
- Daily security news on the private admin page (from a claude-configuration session; the `security-news` skill stays there too)
  - Something deployed runs it daily: a simple Lambda, or whatever is the cheapest option. Must stay self-hostable in AWS
  - Same search and brief as the skill: `~/Projects/claude-configuration/skills/security-news/SKILL.md`, layout in `assets/template.md`
  - Storage is done: `security_briefs` / `security_brief_items` in `packages/db`, validated by `securityBriefInputSchema` in `@portfolio/contracts`
  - Backend: `POST` that upserts a brief by run date (replacing its items; `position` comes from array order per section) and `GET` list / by date, admin-only
  - Admin page displays them by date, so previous history can be browsed too
  - The admin page is meant as a personal display of things I want to see
