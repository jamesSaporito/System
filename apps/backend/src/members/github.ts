import { ServiceUnavailableException } from "@nestjs/common";
import { z } from "zod";

const githubUserSchema = z.object({ id: z.number(), login: z.string() });

/** Resolves a GitHub username to its stable numeric ID. Null if the account doesn't exist. */
export async function findGithubUser(login: string): Promise<{ id: string; login: string } | null> {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "portfolio-cms" },
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new ServiceUnavailableException("Couldn't reach GitHub to look up that user");
  const user = githubUserSchema.parse(await response.json());
  return { id: String(user.id), login: user.login };
}
