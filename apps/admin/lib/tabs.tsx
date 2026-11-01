"use client";

import type { MeResponse, Permission } from "@portfolio/contracts";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useWorkspace } from "@/lib/workspace";

/** What a tab needs: a permission, or "admin" for the ones admins alone can open. */
type Access = Permission | "admin";

export type Tab = { href: string; label: string; access: Access };

/** A nav entry for a page with its own sidebar of tabs (Settings); it opens the first one. */
export type TabSection = { href: string; label: string; tabs: readonly Tab[] };

export type NavItem = Tab | TabSection;

export const isSection = (item: NavItem): item is TabSection => "tabs" in item;

/** Settings' pages, listed in its sidebar. */
export const SETTINGS: TabSection = {
  href: "/settings/",
  label: "Settings",
  tabs: [
    { href: "/settings/members/", label: "Members", access: "admin" },
    { href: "/settings/sessions/", label: "Sessions", access: "SESSIONS" },
  ],
};

/** In nav order. The backend enforces each tab; hiding one is only a convenience. */
export const NAV: readonly NavItem[] = [
  { href: "/", label: "Dashboard", access: "DASHBOARD" },
  { href: "/vulnerability-report/", label: "Vulnerability Report", access: "SECURITY" },
  // Always last: new tabs go above it.
  SETTINGS,
];

/** Every tab, sections flattened, in nav order. */
export const TABS: readonly Tab[] = NAV.flatMap((item) => (isSection(item) ? item.tabs : [item]));

export function canOpen(me: MeResponse, access: Access): boolean {
  return access === "admin" ? me.isAdmin : me.permissions.includes(access);
}

export function visibleTabs(me: MeResponse): Tab[] {
  return TABS.filter((tab) => canOpen(me, tab.access));
}

/** The nav as `me` sees it: tabs they can't open are left out, and so are sections left empty. */
export function visibleNav(me: MeResponse): NavItem[] {
  return NAV.flatMap((item): NavItem[] => {
    if (!isSection(item)) return canOpen(me, item.access) ? [item] : [];
    const tabs = item.tabs.filter((tab) => canOpen(me, tab.access));
    return tabs.length > 0 ? [{ ...item, tabs }] : [];
  });
}

/**
 * Renders the page only for someone who may open it. Otherwise sends them to the first tab they
 * can open, or says they have none yet.
 */
export function RequireAccess({ access, children }: { access: Access; children: ReactNode }) {
  const router = useRouter();
  const { me } = useWorkspace();
  const allowed = canOpen(me, access);
  const fallback = visibleTabs(me)[0];

  useEffect(() => {
    if (!allowed && fallback) router.replace(fallback.href);
  }, [allowed, fallback, router]);

  if (allowed) return children;
  if (fallback) return <p className="text-neutral-500">Loading…</p>;
  return (
    <p className="text-neutral-500">
      You don&apos;t have access to anything yet. Ask an admin to grant you a tab.
    </p>
  );
}
