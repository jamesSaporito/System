"use client";

import type { MeResponse, Permission } from "@portfolio/contracts";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import {
  DashboardIcon,
  type Icon,
  MembersIcon,
  SessionsIcon,
  SettingsIcon,
  ShieldIcon,
} from "@/components/icons";
import { useWorkspace } from "@/lib/workspace";

/** What a tab needs: a permission, or "admin" for the ones admins alone can open. */
type Access = Permission | "admin";

/** `icon` is shown in the sidebar; without one, a tab shows its first letter. */
export type Tab = { href: string; label: string; access: Access; icon?: Icon };

/**
 * A nav entry whose pages slide into the sidebar in place of the main nav (Settings); its own
 * page opens the first one.
 */
export type TabSection = { href: string; label: string; icon: Icon; tabs: readonly Tab[] };

export type NavItem = Tab | TabSection;

export const isSection = (item: NavItem): item is TabSection => "tabs" in item;

/** "/settings/members/" and "/settings/members" compare equal. */
const normalize = (path: string) => path.replace(/\/+$/, "");

/** Whether `href` is the current page or, except for the root, one of its parents. */
export function isActive(href: string, pathname: string): boolean {
  const target = normalize(href);
  const current = normalize(pathname);
  return target === "" ? current === "" : current === target || current.startsWith(`${target}/`);
}

/** Settings' pages, which slide into the sidebar. */
export const SETTINGS: TabSection = {
  href: "/settings/",
  label: "Settings",
  icon: SettingsIcon,
  tabs: [
    { href: "/settings/members/", label: "Members", access: "admin", icon: MembersIcon },
    { href: "/settings/sessions/", label: "Sessions", access: "SESSIONS", icon: SessionsIcon },
  ],
};

/** In nav order. The backend enforces each tab; hiding one is only a convenience. */
export const NAV: readonly NavItem[] = [
  { href: "/", label: "Dashboard", access: "DASHBOARD", icon: DashboardIcon },
  {
    href: "/vulnerability-report/",
    label: "Vulnerability Report",
    access: "SECURITY",
    icon: ShieldIcon,
  },
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
  if (fallback) return <p className="text-muted">Loading…</p>;
  return (
    <p className="text-muted">
      You don&apos;t have access to anything yet. Ask an admin to grant you a tab.
    </p>
  );
}
