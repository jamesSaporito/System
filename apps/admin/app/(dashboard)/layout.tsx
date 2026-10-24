"use client";

import type { MeResponse, SiteWithRole } from "@portfolio/contracts";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useCallback, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useResource } from "@/lib/use-resource";
import { type Workspace, WorkspaceContext } from "@/lib/workspace";

const LAST_SITE_KEY = "admin:lastSite";

/** Everything in this group requires a session; the backend enforces it, this just redirects. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in/");
  }, [isPending, session, router]);

  if (!session) return <p className="text-neutral-500">Loading…</p>;

  return (
    // useSearchParams needs a Suspense boundary in a static export.
    <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const requestedSlug = useSearchParams().get("site");
  const loadMe = useCallback(() => api<MeResponse>("/me"), []);
  const { state, reload } = useResource(loadMe);
  const me = state.status === "ready" ? state.data : null;
  const site = me ? pickSite(me.sites, requestedSlug) : null;

  // Keep the selected site in the URL (shareable, survives reloads) and remember it for next time.
  useEffect(() => {
    if (!site) return;
    rememberSite(site.slug);
    if (site.slug !== requestedSlug) router.replace(`${pathname}?site=${site.slug}`);
  }, [site, requestedSlug, pathname, router]);

  const workspace = useMemo<Workspace | null>(
    () =>
      me && {
        me,
        site,
        href: (path) => (site ? `${path}?site=${site.slug}` : path),
        reloadMe: reload,
      },
    [me, site, reload],
  );

  if (state.status === "error") {
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        {state.message}
      </p>
    );
  }
  if (!workspace) return <p className="text-neutral-500">Loading…</p>;

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in/");
  }

  const { href } = workspace;
  return (
    <WorkspaceContext value={workspace}>
      <header className="mb-8 flex flex-wrap items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        {workspace.me.sites.length > 0 && site ? (
          <select
            aria-label="Site"
            value={site.slug}
            onChange={(event) => router.push(`${pathname}?site=${event.target.value}`)}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 font-semibold dark:border-neutral-700"
          >
            {workspace.me.sites.map(({ slug, name }) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
        <nav className="flex gap-4">
          <Link href={href("/")}>Dashboard</Link>
          {site?.role === "OWNER" ? <Link href={href("/members/")}>Members</Link> : null}
          {workspace.me.isPlatformAdmin ? <Link href={href("/sites/")}>Sites</Link> : null}
          <Link href={href("/sessions/")}>Sessions</Link>
        </nav>
        <span className="ml-auto text-sm text-neutral-500">{workspace.me.user.name}</span>
        <button type="button" onClick={() => void signOut()} className="text-sm underline">
          Sign out
        </button>
      </header>
      <main>{children}</main>
    </WorkspaceContext>
  );
}

function pickSite(sites: SiteWithRole[], requestedSlug: string | null): SiteWithRole | null {
  const lastSlug = readLastSite();
  return (
    sites.find(({ slug }) => slug === requestedSlug) ??
    sites.find(({ slug }) => slug === lastSlug) ??
    sites[0] ??
    null
  );
}

// localStorage can throw (private mode, blocked storage); the selection just isn't remembered then.
function readLastSite(): string | null {
  try {
    return localStorage.getItem(LAST_SITE_KEY);
  } catch {
    return null;
  }
}

function rememberSite(slug: string): void {
  try {
    localStorage.setItem(LAST_SITE_KEY, slug);
  } catch {
    // Ignore.
  }
}
