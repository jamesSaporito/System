import { z } from "zod";

// The RSS/Atom feeds the security brief reads alongside CISA KEV and GitHub's advisories, edited
// by admins in the Vulnerability Report tab.

const httpUrlSchema = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/ }));

export const addSecurityNewsFeedSchema = z.strictObject({ url: httpUrlSchema });
export type AddSecurityNewsFeedInput = z.infer<typeof addSecurityNewsFeedSchema>;

// Responses.

export type SecurityNewsFeed = {
  id: string;
  url: string;
  createdAt: string;
  /** When it was last read successfully; null before the first read. */
  fetchedAt: string | null;
};

export type SecurityNewsFeedsResponse = { feeds: SecurityNewsFeed[] };
