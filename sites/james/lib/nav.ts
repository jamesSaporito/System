import { published } from "./drafts";

export type NavLink = { href: string; label: string; draft?: boolean };
/** A tab; with `children` it opens a dropdown of sub-projects instead of linking directly. */
export type NavItem = NavLink & { children?: NavLink[] };

// Read on the server (layout.tsx), so drafts are filtered out before anything reaches the browser.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/motorcycle/", label: "Motorcycle" },
  { href: "/nixie/", label: "Nixie" },
  { href: "/freeform/", label: "Freeform" },
  // Add sub-projects as { href: "/watch/<slug>/", label: "…" }, with a page.draft.tsx at
  // app/watch/<slug>/ while the section is a draft.
  { href: "/watch/", label: "Watch", draft: true, children: [] },
];

/** The nav as the current build should show it. */
export function navItems(): NavItem[] {
  return published(NAV_ITEMS).map((item) =>
    item.children ? { ...item, children: published(item.children) } : item,
  );
}
