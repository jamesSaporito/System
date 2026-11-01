import { z } from "zod";
import { AccessError } from "./errors";

/** `fetch`'s shape; tests pass a fake. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const githubUserSchema = z.object({ id: z.number(), login: z.string() });

/** Resolves a GitHub username to its stable numeric ID. Null if the account doesn't exist. */
export async function findGithubUser(
  fetch: FetchLike,
  login: string,
): Promise<{ id: string; login: string } | null> {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "portfolio-admin" },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new AccessError("unavailable", "Couldn't reach GitHub to look up that user");
  }
  const user = githubUserSchema.parse(await response.json());
  return { id: String(user.id), login: user.login };
}
