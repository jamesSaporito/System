"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/workspace";

export default function DashboardPage() {
  const { me, site, href } = useWorkspace();

  if (!site) {
    return (
      <>
        <h1 className="text-3xl font-bold">Welcome</h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          {me.isPlatformAdmin ? (
            <>
              There are no sites yet.{" "}
              <Link href="/sites/" className="underline">
                Create one
              </Link>
              .
            </>
          ) : (
            "You don't belong to any site yet."
          )}
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold">{site.name}</h1>
      <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-neutral-500">Domain</dt>
        <dd>{site.domain ?? "Not set"}</dd>
        <dt className="text-neutral-500">Frontend</dt>
        <dd>
          <code>sites/{site.slug}</code>
        </dd>
        <dt className="text-neutral-500">Your role</dt>
        <dd>{site.role === "OWNER" ? "Owner" : "Editor"}</dd>
      </dl>
      <p className="mt-8 text-neutral-600 dark:text-neutral-400">
        {site.role === "OWNER" ? (
          <>
            You can{" "}
            <Link href={href("/members/")} className="underline">
              manage members
            </Link>
            .
          </>
        ) : null}
      </p>
    </>
  );
}
