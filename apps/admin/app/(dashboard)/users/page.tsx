"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type User = { id: string; name: string; email: string; createdAt: Date };
type Session = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  expiresAt: Date;
};
type UserWithSessions = User & { sessions: Session[] };

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; users: UserWithSessions[] };

async function fetchUsers(): Promise<LoadState> {
  const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });
  if (error) return { status: "error", message: error.message ?? "Failed to load users." };
  const users = await Promise.all(
    data.users.map(async (user) => {
      const { data: sessions } = await authClient.admin.listUserSessions({ userId: user.id });
      return { ...user, sessions: sessions?.sessions ?? [] };
    }),
  );
  return { status: "ready", users };
}

export default function UsersPage() {
  const { data: current } = authClient.useSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  async function reload() {
    setState(await fetchUsers());
  }

  useEffect(() => {
    let cancelled = false;
    void fetchUsers().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function revokeSession(sessionToken: string) {
    await authClient.admin.revokeUserSession({ sessionToken });
    await reload();
  }

  async function removeUser(user: User) {
    if (!window.confirm(`Remove ${user.email}? They can sign in again if still allowlisted.`)) {
      return;
    }
    await authClient.admin.removeUser({ userId: user.id });
    await reload();
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Users</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Who can sign in is controlled by <code>ADMIN_GITHUB_IDS</code> on the backend.
      </p>
      {state.status === "error" ? (
        <p role="alert" className="mt-6 text-red-600 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
      {state.status === "loading" ? <p className="mt-6 text-neutral-500">Loading…</p> : null}
      <ul className="mt-6 grid gap-4">
        {(state.status === "ready" ? state.users : []).map((user) => {
          const isCurrentUser = user.id === current?.user.id;
          return (
            <li
              key={user.id}
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-baseline gap-2">
                <h2 className="font-semibold">{user.name}</h2>
                <span className="text-sm text-neutral-500">{user.email}</span>
                {isCurrentUser ? <span className="text-xs text-neutral-500">(you)</span> : null}
                {isCurrentUser ? null : (
                  <button
                    type="button"
                    onClick={() => void removeUser(user)}
                    className="ml-auto text-sm text-red-600 underline dark:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              <h3 className="mt-3 text-sm font-medium">Sessions</h3>
              <ul className="mt-1 grid gap-1 text-sm">
                {user.sessions.length === 0 ? <li className="text-neutral-500">None</li> : null}
                {user.sessions.map((session) => {
                  const isCurrentSession = session.id === current?.session.id;
                  return (
                    <li key={session.id} className="flex items-center gap-2">
                      <span className="truncate text-neutral-600 dark:text-neutral-400">
                        {session.userAgent ?? "Unknown device"} ·{" "}
                        {session.ipAddress ?? "unknown IP"} · signed in{" "}
                        {new Date(session.createdAt).toLocaleString()}
                      </span>
                      {isCurrentSession ? (
                        <span className="ml-auto text-xs text-neutral-500">this browser</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void revokeSession(session.token)}
                          className="ml-auto shrink-0 underline"
                        >
                          Revoke
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}
