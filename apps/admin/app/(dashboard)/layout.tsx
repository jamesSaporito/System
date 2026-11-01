"use client";

import type { MeResponse } from "@portfolio/access/api";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { MenuIcon } from "@/components/icons";
import { Sidebar, useSidebarCollapsed } from "@/components/sidebar";
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

  if (!session) return <p className="p-8 text-muted">Loading…</p>;

  return <WorkspaceShell>{children}</WorkspaceShell>;
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const loadMe = useCallback(() => api<MeResponse>("/me"), []);
  const { state, reload } = useResource(loadMe);
  const me = state.status === "ready" ? state.data : null;

  const workspace = useMemo<Workspace | null>(() => me && { me, reloadMe: reload }, [me, reload]);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  // The phone menu is a modal <dialog>: it traps focus and closes on Escape by itself.
  const menuRef = useRef<HTMLDialogElement>(null);
  const closeMenu = useCallback(() => menuRef.current?.close(), []);

  if (state.status === "error") {
    return (
      <p role="alert" className="p-8 text-urgent">
        {state.message}
      </p>
    );
  }
  if (!workspace) return <p className="p-8 text-muted">Loading…</p>;

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in/");
  }

  return (
    <WorkspaceContext value={workspace}>
      <div className="flex min-h-dvh">
        <aside
          className={`sticky top-0 hidden h-dvh shrink-0 border-r border-line bg-surface transition-[width] duration-200 md:block ${
            collapsed ? "w-16" : "w-60"
          }`}
        >
          <Sidebar
            me={workspace.me}
            collapsed={collapsed}
            onSignOut={() => void signOut()}
            onToggleCollapsed={toggleCollapsed}
          />
        </aside>

        <dialog
          ref={menuRef}
          aria-label="Menu"
          className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-transparent md:hidden"
        >
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={closeMenu}
            className="absolute inset-0 size-full cursor-default bg-canvas/70 backdrop-blur-sm"
          />
          <div className="relative h-full w-64 max-w-[85vw] border-r border-line bg-surface shadow-2xl">
            <Sidebar
              me={workspace.me}
              collapsed={false}
              onSignOut={() => void signOut()}
              onClose={closeMenu}
            />
          </div>
        </dialog>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur md:hidden">
            <button
              type="button"
              onClick={() => menuRef.current?.showModal()}
              aria-label="Open menu"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              <MenuIcon className="size-5" />
            </button>
            <span className="font-semibold tracking-tight">Admin</span>
          </header>
          <main className="min-w-0 flex-1 px-4 py-8 md:px-10">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </WorkspaceContext>
  );
}
