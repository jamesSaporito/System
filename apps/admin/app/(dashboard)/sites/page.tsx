"use client";

import type { Site } from "@portfolio/contracts";
import Link from "next/link";
import { type FormEvent, useCallback, useState } from "react";
import { api, describeError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useWorkspace } from "@/lib/workspace";

export default function SitesPage() {
  const { me } = useWorkspace();
  if (!me.isPlatformAdmin)
    return <p className="text-neutral-500">Only platform admins can manage sites.</p>;
  return <Sites />;
}

function Sites() {
  const { reloadMe } = useWorkspace();
  const load = useCallback(() => api<Site[]>("/sites"), []);
  const { state, reload } = useResource(load);

  async function create(input: { slug: string; name: string; domain: string | null }) {
    await api<Site>("/sites", { method: "POST", body: JSON.stringify(input) });
    await Promise.all([reload(), reloadMe()]);
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Sites</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Each site needs a matching frontend app in <code>sites/&lt;slug&gt;</code> and its own
        hosting. Add owners from the site&apos;s Members page.
      </p>
      <CreateSiteForm onCreate={create} />
      {state.status === "loading" ? <p className="mt-6 text-neutral-500">Loading…</p> : null}
      {state.status === "error" ? (
        <p role="alert" className="mt-6 text-red-600 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
      {state.status === "ready" ? (
        <ul className="mt-6 grid gap-2">
          {state.data.map((site) => (
            <li
              key={site.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <span className="font-medium">{site.name}</span>
              <code className="text-sm text-neutral-500">sites/{site.slug}</code>
              <span className="text-sm text-neutral-500">{site.domain ?? "no domain"}</span>
              <Link href={`/members/?site=${site.slug}`} className="ml-auto text-sm underline">
                Members
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function CreateSiteForm({
  onCreate,
}: {
  onCreate: (input: { slug: string; name: string; domain: string | null }) => Promise<void>;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onCreate({ slug: slug.trim(), name: name.trim(), domain: domain.trim() || null });
      setSlug("");
      setName("");
      setDomain("");
    } catch (caught) {
      setError(describeError(caught));
    }
    setPending(false);
  }

  const input =
    "rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700";
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
    >
      <label className="grid gap-1 text-sm">
        Name
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={input}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Slug
        <input
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Lowercase letters, numbers, and single dashes"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          className={input}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Domain (optional)
        <input
          placeholder="www.example.com"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          className={input}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Creating…" : "Create site"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-600 sm:col-span-4 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
