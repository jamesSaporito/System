"use client";

import { authClient } from "@/lib/auth-client";
import { RequireAccess } from "@/lib/tabs";
import { useResource } from "@/lib/use-resource";

async function listSessions() {
  const { data, error } = await authClient.listSessions();
  if (error) throw new Error(error.message ?? "Failed to load sessions");
  return data;
}

/** Your own signed-in devices. Revoking one signs that browser out. */
export default function SessionsPage() {
  return (
    <RequireAccess access="SESSIONS">
      <Sessions />
    </RequireAccess>
  );
}

function Sessions() {
  const { data: current } = authClient.useSession();
  const { state, reload } = useResource(listSessions);

  async function revoke(token: string) {
    await authClient.revokeSession({ token });
    await reload();
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Sessions</h1>
      <p className="mt-2 text-sm text-muted">Browsers where you&apos;re signed in.</p>
      {state.status === "loading" ? <p className="mt-6 text-muted">Loading…</p> : null}
      {state.status === "error" ? (
        <p role="alert" className="mt-6 text-urgent">
          {state.message}
        </p>
      ) : null}
      {state.status === "ready" ? (
        <ul className="mt-6 grid gap-2 text-sm">
          {state.data.map((session) => (
            <li
              key={session.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3"
            >
              <span className="truncate text-muted">
                {session.userAgent ?? "Unknown device"} · {session.ipAddress ?? "unknown IP"} ·
                signed in {new Date(session.createdAt).toLocaleString()}
              </span>
              {session.id === current?.session.id ? (
                <span className="ml-auto shrink-0 text-xs text-muted">this browser</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void revoke(session.token)}
                  className="ml-auto shrink-0 rounded-md px-2 py-1 text-urgent transition-colors hover:bg-urgent/10"
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
