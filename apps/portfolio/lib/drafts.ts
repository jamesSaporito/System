// Drafts are sections that aren't ready to publish. They show up in `next dev` only; production
// builds leave them out of the HTML and JavaScript entirely (not hidden with CSS), so they can't be
// revealed from the browser.
//   - Nav items and Home tiles: mark them `draft: true`.
//   - Pages: name the file `page.draft.tsx`. next.config.ts only treats that as a page in dev, so
//     production builds don't produce the route at all.
// Only read SHOW_DRAFTS in server components: a client component would ship the draft data in its
// JavaScript even when it isn't rendered.
export const SHOW_DRAFTS = process.env.NODE_ENV === "development";

/** Drops items marked as drafts, unless drafts are shown (dev). */
export function published<T extends { draft?: boolean }>(items: T[]): T[] {
  return SHOW_DRAFTS ? items : items.filter((item) => !item.draft);
}
