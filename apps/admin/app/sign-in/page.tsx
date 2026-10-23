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
    <main className="mx-auto mt-24 max-w-sm text-center">
      <h1 className="text-2xl font-bold">Admin</h1>
      {message ? (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={pending}
        className="mt-6 w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Redirecting…" : "Sign in with GitHub"}
      </button>
    </main>
  );
}
