"use client";

import {
  type Member,
  type MembersResponse,
  PERMISSION_PRESET_NAMES,
  PERMISSION_PRESETS,
  PERMISSIONS,
  type Permission,
  type PermissionPreset,
} from "@portfolio/contracts";
import Image from "next/image";
import { type FormEvent, useCallback, useState } from "react";
import { api, describeError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { RequireAccess } from "@/lib/tabs";

const PERMISSION_LABELS: Record<Permission, string> = {
  DASHBOARD: "Dashboard",
  SESSIONS: "Sessions",
  SECURITY: "Vulnerability Report",
};

const PRESET_LABELS: Record<PermissionPreset, string> = {
  none: "No access",
  viewer: "Viewer",
  full: "Full access",
};

/** The preset whose permissions match exactly, if any. */
function matchingPreset(permissions: readonly Permission[]): PermissionPreset | "custom" {
  const match = PERMISSION_PRESET_NAMES.find((name) => {
    const preset = PERMISSION_PRESETS[name];
    return preset.length === permissions.length && preset.every((p) => permissions.includes(p));
  });
  return match ?? "custom";
}

export default function MembersPage() {
  return (
    <RequireAccess access="admin">
      <Members />
    </RequireAccess>
  );
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
      <p className="mt-2 text-sm text-muted">People who can sign in to this admin with GitHub.</p>
      {notice ? (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-4 text-sm ${notice.kind === "error" ? "text-urgent" : "text-ok"}`}
        >
          {notice.text}
        </p>
      ) : null}

      <AddForm
        onAdd={(githubLogin) =>
          mutate(async () => {
            const member = await api<Member>("/members", {
              method: "POST",
              body: JSON.stringify({ githubLogin, permissions: PERMISSION_PRESETS.viewer }),
            });
            setNotice({ kind: "info", text: `Added ${member.githubLogin}.` });
          })
        }
      />

      {state.status === "loading" ? <p className="mt-6 text-muted">Loading…</p> : null}
      {state.status === "error" ? (
        <p role="alert" className="mt-6 text-urgent">
          {state.message}
        </p>
      ) : null}
      {state.status === "ready" ? (
        state.data.members.length === 0 ? (
          <p className="mt-6 text-muted">No members yet.</p>
        ) : (
          <ul className="mt-6 grid gap-2">
            {state.data.members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3"
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
                <span className="text-sm text-muted">
                  @{member.githubLogin}
                  {member.user ? null : " · hasn't signed in yet"}
                </span>
                <PermissionsEditor
                  permissions={member.permissions}
                  onChange={(permissions) =>
                    void mutate(() =>
                      api(`/members/${member.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ permissions }),
                      }),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Remove ${member.githubLogin}? They'll be signed out.`))
                      return;
                    void mutate(() => api(`/members/${member.id}`, { method: "DELETE" }));
                  }}
                  className="ml-auto rounded-md px-2 py-1 text-sm text-urgent transition-colors hover:bg-urgent/10"
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

/** A preset to start from, then the tabs themselves. Only the checked tabs are saved. */
function PermissionsEditor({
  permissions,
  onChange,
}: {
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
}) {
  const preset = matchingPreset(permissions);
  return (
    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <label className="flex items-center gap-2">
        Access
        <select
          value={preset}
          onChange={(event) => {
            const name = PERMISSION_PRESET_NAMES.find((n) => n === event.target.value);
            if (name) onChange([...PERMISSION_PRESETS[name]]);
          }}
          className="rounded-md border border-line bg-raised px-2.5 py-1.5 transition-colors hover:border-line-strong"
        >
          {PERMISSION_PRESET_NAMES.map((name) => (
            <option key={name} value={name}>
              {PRESET_LABELS[name]}
            </option>
          ))}
          {preset === "custom" ? <option value="custom">Custom</option> : null}
        </select>
      </label>
      {PERMISSIONS.map((permission) => (
        <label key={permission} className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="accent-accent"
            checked={permissions.includes(permission)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...permissions, permission]
                  : permissions.filter((p) => p !== permission),
              )
            }
          />
          {PERMISSION_LABELS[permission]}
        </label>
      ))}
    </div>
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
          className="rounded-md border border-line bg-raised px-2.5 py-1.5 transition-colors hover:border-line-strong"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-canvas transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
