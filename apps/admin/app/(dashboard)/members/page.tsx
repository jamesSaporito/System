"use client";

import type { Member, MembersResponse } from "@portfolio/contracts";
import Image from "next/image";
import { type FormEvent, useCallback, useState } from "react";
import { api, describeError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useWorkspace } from "@/lib/workspace";

export default function MembersPage() {
  const { me } = useWorkspace();
  if (!me.isAdmin) return <p className="text-neutral-500">Only admins can manage members.</p>;
  return <Members />;
}

function Members() {
  const load = useCallback(() => api<MembersResponse>("/members"), []);
  const { state, reload } = useResource(load);
  const [notice, setNotice] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  /** Runs a change, then refreshes the list. */
  async function mutate(action: () => Promise<unknown>) {
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    }
    await reload();
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Members</h1>
      <p className="mt-2 text-sm text-neutral-500">
        People who can sign in to this admin with GitHub.
      </p>
      {notice ? (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-4 text-sm ${notice.kind === "error" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
        >
          {notice.text}
        </p>
      ) : null}

      <AddForm
        onAdd={(githubLogin) =>
          mutate(async () => {
            const member = await api<Member>("/members", {
              method: "POST",
              body: JSON.stringify({ githubLogin }),
            });
            setNotice({ kind: "info", text: `Added ${member.githubLogin}.` });
          })
        }
      />

      {state.status === "loading" ? <p className="mt-6 text-neutral-500">Loading…</p> : null}
      {state.status === "error" ? (
        <p role="alert" className="mt-6 text-red-600 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
      {state.status === "ready" ? (
        state.data.members.length === 0 ? (
          <p className="mt-6 text-neutral-500">No members yet.</p>
        ) : (
          <ul className="mt-6 grid gap-2">
            {state.data.members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
              >
                {member.user?.image ? (
                  <Image
                    src={member.user.image}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : null}
                <span className="font-medium">{member.user?.name ?? member.githubLogin}</span>
                <span className="text-sm text-neutral-500">
                  @{member.githubLogin}
                  {member.user ? null : " · hasn't signed in yet"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Remove ${member.githubLogin}? They'll be signed out.`))
                      return;
                    void mutate(() => api(`/members/${member.id}`, { method: "DELETE" }));
                  }}
                  className="ml-auto text-sm text-red-600 underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </>
  );
}

function AddForm({ onAdd }: { onAdd: (githubLogin: string) => Promise<void> }) {
  const [githubLogin, setGithubLogin] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    await onAdd(githubLogin.trim());
    setPending(false);
    setGithubLogin("");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-6 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">
        GitHub username
        <input
          required
          value={githubLogin}
          onChange={(event) => setGithubLogin(event.target.value)}
          className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
