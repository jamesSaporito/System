"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

/** Everything in this group requires a session; the backend enforces it, this just redirects. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in/");
  }, [isPending, session, router]);

  if (!session) return <p className="text-neutral-500">Loading…</p>;

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in/");
  }

  return (
    <>
      <header className="mb-8 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <nav className="flex gap-4">
          <Link href="/">Dashboard</Link>
          <Link href="/users/">Users</Link>
        </nav>
        <span className="ml-auto text-sm text-neutral-500">{session.user.name}</span>
        <button type="button" onClick={() => void signOut()} className="text-sm underline">
          Sign out
        </button>
      </header>
      <main>{children}</main>
    </>
  );
}
