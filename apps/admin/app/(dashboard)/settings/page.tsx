"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { canOpen, SETTINGS } from "@/lib/tabs";
import { useWorkspace } from "@/lib/workspace";

/** Settings has no page of its own: it opens the first one in its sidebar you can open. */
export default function SettingsPage() {
  const router = useRouter();
  const { me } = useWorkspace();
  const first = SETTINGS.tabs.find((tab) => canOpen(me, tab.access));

  useEffect(() => {
    if (first) router.replace(first.href);
  }, [first, router]);

  return first ? (
    <p className="text-muted">Loading…</p>
  ) : (
    <p className="text-muted">There are no settings you can change.</p>
  );
}
