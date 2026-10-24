import { BACKEND_URL } from "./auth-client";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Calls the backend with the session cookie. Throws ApiError with the backend's message. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- shapes come from @portfolio/contracts
  return (response.status === 204 ? undefined : await response.json()) as T;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      const { message } = body;
      if (Array.isArray(message)) return message.join(", ");
      if (typeof message === "string") return message;
    }
  } catch {
    // Not JSON; fall through.
  }
  return `Request failed (${response.status})`;
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
