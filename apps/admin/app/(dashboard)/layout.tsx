"use client";

import type { MeResponse } from "@portfolio/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useResource } from "@/lib/use-resource";
import { type Workspace, WorkspaceContext } from "@/lib/workspace";

/** Everything in this group requires a session; the backend enforces it, this just redirects. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in/");
  }, [isPending, session, router]);

  if (!session) return <p className="text-neutral-500">Loading…</p>;

  return <WorkspaceShell>{children}</WorkspaceShell>;
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const loadMe = useCallback(() => api<MeResponse>("/me"), []);
  const { state, reload } = useResource(loadMe);
  const me = state.status === "ready" ? state.data : null;

  const workspace = useMemo<Workspace | null>(() => me && { me, reloadMe: reload }, [me, reload]);

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

  return (
    <WorkspaceContext value={workspace}>
      <header className="mb-8 flex flex-wrap items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <nav className="flex gap-4">
          <Link href="/">Dashboard</Link>
          {workspace.me.isAdmin ? <Link href="/members/">Members</Link> : null}
          <Link href="/sessions/">Sessions</Link>
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
