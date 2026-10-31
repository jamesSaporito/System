"use client";

import { useWorkspace } from "@/lib/workspace";

export default function DashboardPage() {
  const { me } = useWorkspace();

  return (
    <>
      <h1 className="text-3xl font-bold">Welcome, {me.user.name}</h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-400">Nothing here yet.</p>
    </>
  );
}
