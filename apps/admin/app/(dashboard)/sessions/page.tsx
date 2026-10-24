"use client";

import { authClient } from "@/lib/auth-client";
import { useResource } from "@/lib/use-resource";

async function listSessions() {
  const { data, error } = await authClient.listSessions();
  if (error) throw new Error(error.message ?? "Failed to load sessions");
  return data;
}

/** Your own signed-in devices. Revoking one signs that browser out. */
export default function SessionsPage() {
  const { data: current } = authClient.useSession();
  const { state, reload } = useResource(listSessions);

  async function revoke(token: string) {
    await authClient.revokeSession({ token });
    await reload();
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Sessions</h1>
      <p className="mt-2 text-sm text-neutral-500">Browsers where you&apos;re signed in.</p>
      {state.status === "loading" ? <p className="mt-6 text-neutral-500">Loading…</p> : null}
      {state.status === "error" ? (
        <p role="alert" className="mt-6 text-red-600 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
      {state.status === "ready" ? (
        <ul className="mt-6 grid gap-2 text-sm">
          {state.data.map((session) => (
            <li
              key={session.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <span className="truncate text-neutral-600 dark:text-neutral-400">
                {session.userAgent ?? "Unknown device"} · {session.ipAddress ?? "unknown IP"} ·
                signed in {new Date(session.createdAt).toLocaleString()}
              </span>
              {session.id === current?.session.id ? (
                <span className="ml-auto shrink-0 text-xs text-neutral-500">this browser</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void revoke(session.token)}
                  className="ml-auto shrink-0 underline"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
