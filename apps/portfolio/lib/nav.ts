import { published } from "./drafts";
import { WATCHES, watchHref } from "./watches";

export type NavLink = { href: string; label: string; draft?: boolean };
/**
 * A tab; with `children` it opens a dropdown of sub-projects instead of linking directly. Inside a
 * dropdown, an item with `children` is a group that expands to its own sub-pages.
 */
export type NavItem = NavLink & { children?: NavItem[] };

/** One dropdown group per maker, each listing its watches by grade. */
function watchGroups(): NavItem[] {
  const makers = [...new Set(WATCHES.map((w) => w.maker))].toSorted();
  return makers.map((maker) => ({
    href: `/time/${maker.toLowerCase()}/`,
    label: maker,
    children: WATCHES.filter((w) => w.maker === maker)
      .toSorted((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }))
      .map((w) => ({ href: watchHref(w), label: `Grade ${w.grade}`, draft: w.draft })),
  }));
}

// Read on the server (layout.tsx), so drafts are filtered out before anything reaches the browser.
// A tab or group with `children` is a dropdown; its `href` only identifies it (it isn't linked),
// and it's highlighted when the current page is anywhere inside it.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  {
    href: "/electronics/",
    label: "Electronics",
    children: [
      { href: "/nixie/", label: "Nixie" },
      { href: "/freeform/", label: "Freeform" },
    ],
  },
  {
    href: "/mechanical/",
    label: "Mechanical",
    children: [
      { href: "/motorcycle/", label: "Motorcycle" },
      // Add sub-projects as { href: "/time/<slug>/", label: "…" }; mark individual pages
      // `draft: true` (and name the file page.draft.tsx). Watches come from lib/watches.ts,
      // grouped by maker; a group with no published watches is hidden automatically.
      {
        href: "/time/",
        label: "Time",
        children: [
          { href: "/time/", label: "Overview", draft: true },
          { href: "/time/tools/", label: "Tools" },
          ...watchGroups(),
        ],
      },
    ],
  },
  { href: "/art/", label: "Art" },
  { href: "/leather/", label: "Leather", draft: true },
];

/**
 * Drops drafts at every level of the tree. A group inside a dropdown with no published pages left
 * is dropped too; a top-level tab keeps its dropdown, which then reads "No projects yet".
 */
function publishedTree(items: NavItem[], nested = false): NavItem[] {
  return published(items).flatMap((item) => {
    if (!item.children) return [item];
    const children = publishedTree(item.children, true);
    return nested && children.length === 0 ? [] : [{ ...item, children }];
  });
}

/** The nav as the current build should show it. */
export function navItems(): NavItem[] {
  return publishedTree(NAV_ITEMS);
}
