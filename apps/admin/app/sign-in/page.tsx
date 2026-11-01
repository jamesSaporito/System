"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

// Better Auth redirects back here with ?error=<code> when the OAuth callback fails.
// account_not_allowed comes from the backend's GitHub allowlist (apps/backend/src/auth/auth.ts).
const ERROR_MESSAGES: Record<string, string> = {
  account_not_allowed: "This GitHub account isn't allowed to sign in.",
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const errorCode = useSearchParams().get("error");
  const { data: session } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  async function signIn() {
    setPending(true);
    setRequestError(null);
    const origin = window.location.origin;
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: `${origin}/`,
      errorCallbackURL: `${origin}/sign-in/`,
    });
    // On success the browser is already navigating to GitHub.
    if (error) {
      setRequestError(error.message ?? "Sign-in failed. Is the backend running?");
      setPending(false);
    }
  }

  const message =
    requestError ??
    (errorCode ? (ERROR_MESSAGES[errorCode] ?? `Sign-in failed (${errorCode}).`) : null);

  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-2xl shadow-black/30">
        <span
          aria-hidden
          className="mx-auto grid size-10 place-items-center rounded-lg bg-accent/15 font-mono font-bold text-accent"
        >
          A
        </span>
        <h1 className="mt-4 text-2xl font-bold">Admin</h1>
        {message ? (
          <p role="alert" className="mt-4 text-sm text-urgent">
            {message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void signIn()}
          disabled={pending}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2 font-medium text-canvas transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Redirecting…" : "Sign in with GitHub"}
        </button>
      </div>
    </main>
  );
}
