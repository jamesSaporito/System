"use client";

import {
  type InviteResult,
  type MembersResponse,
  type SiteRole,
  siteRoleSchema,
} from "@portfolio/contracts";
import { type FormEvent, useCallback, useState } from "react";
import { api, describeError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useWorkspace } from "@/lib/workspace";

const ROLE_LABELS: Record<SiteRole, string> = { OWNER: "Owner", EDITOR: "Editor" };

export default function MembersPage() {
  const { site } = useWorkspace();
  if (!site) return null;
  if (site.role !== "OWNER") {
    return <p className="text-neutral-500">Only owners of {site.name} can manage its members.</p>;
  }
  // Keyed so switching sites resets the page's state.
  return <Members key={site.id} siteId={site.id} siteName={site.name} />;
}

function Members({ siteId, siteName }: { siteId: string; siteName: string }) {
  const { me, reloadMe } = useWorkspace();
  const load = useCallback(() => api<MembersResponse>(`/sites/${siteId}/members`), [siteId]);
  const { state, reload } = useResource(load);
  const [notice, setNotice] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  /** Runs a change, then refreshes the list (and /me if it might have changed our own access). */
  async function mutate(action: () => Promise<unknown>, affectsMe = false) {
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    }
    await reload();
    if (affectsMe) await reloadMe();
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Members of {siteName}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Owners edit, publish, and manage members. Editors edit content only.
      </p>
      {notice ? (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-4 text-sm ${notice.kind === "error" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
        >
          {notice.text}
        </p>
      ) : null}

      <InviteForm
        onInvite={(githubLogin, role) =>
          mutate(async () => {
            const result = await api<InviteResult>(`/sites/${siteId}/invites`, {
              method: "POST",
              body: JSON.stringify({ githubLogin, role }),
            });
            setNotice({
              kind: "info",
              text:
                result.status === "added"
                  ? `${githubLogin} already had an account and was added.`
                  : `Invited ${githubLogin}. They'll join when they first sign in with GitHub.`,
            });
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
        <>
          <ul className="mt-6 grid gap-2">
            {state.data.members.map((member) => {
              const isMe = member.userId === me.user.id;
              return (
                <li
                  key={member.userId}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <span className="font-medium">{member.name}</span>
                  <span className="text-sm text-neutral-500">{member.email}</span>
                  {isMe ? <span className="text-xs text-neutral-500">(you)</span> : null}
                  <select
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    onChange={(event) => {
                      const role = siteRoleSchema.parse(event.target.value);
                      void mutate(
                        () =>
                          api(`/sites/${siteId}/members/${member.userId}`, {
                            method: "PATCH",
                            body: JSON.stringify({ role }),
                          }),
                        isMe,
                      );
                    }}
                    className="ml-auto rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
                  >
                    <option value="OWNER">{ROLE_LABELS.OWNER}</option>
                    <option value="EDITOR">{ROLE_LABELS.EDITOR}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const prompt = isMe
                        ? `Leave ${siteName}? You'll lose access to it.`
                        : `Remove ${member.name} from ${siteName}?`;
                      if (!window.confirm(prompt)) return;
                      void mutate(
                        () =>
                          api(`/sites/${siteId}/members/${member.userId}`, { method: "DELETE" }),
                        isMe,
                      );
                    }}
                    className="text-sm text-red-600 underline dark:text-red-400"
                  >
                    {isMe ? "Leave" : "Remove"}
                  </button>
                </li>
              );
            })}
          </ul>

          {state.data.invites.length > 0 ? (
            <>
              <h2 className="mt-8 text-lg font-semibold">Pending invites</h2>
              <ul className="mt-2 grid gap-2">
                {state.data.invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700"
                  >
                    <span className="font-medium">{invite.githubLogin}</span>
                    <span className="text-sm text-neutral-500">{ROLE_LABELS[invite.role]}</span>
                    <button
                      type="button"
                      onClick={() =>
                        void mutate(() =>
                          api(`/sites/${siteId}/invites/${invite.id}`, { method: "DELETE" }),
                        )
                      }
                      className="ml-auto text-sm underline"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function InviteForm({
  onInvite,
}: {
  onInvite: (githubLogin: string, role: SiteRole) => Promise<void>;
}) {
  const [githubLogin, setGithubLogin] = useState("");
  const [role, setRole] = useState<SiteRole>("EDITOR");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    await onInvite(githubLogin.trim(), role);
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
      <label className="grid gap-1 text-sm">
        Role
        <select
          value={role}
          onChange={(event) => setRole(siteRoleSchema.parse(event.target.value))}
          className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
        >
          <option value="EDITOR">{ROLE_LABELS.EDITOR}</option>
          <option value="OWNER">{ROLE_LABELS.OWNER}</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Inviting…" : "Invite"}
      </button>
    </form>
  );
}
