"use client";

import { authClient } from "@/lib/auth-client";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-400">
        Signed in as {session?.user.email}. Content management arrives in the next phase.
      </p>
    </>
  );
}
