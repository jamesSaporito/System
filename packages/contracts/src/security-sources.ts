import { z } from "zod";

// The sites the daily security brief's research uses, edited by admins in the Vulnerability
// Report tab.

export const addSecurityNewsSourceSchema = z.strictObject({
  url: z
    .string()
    .trim()
    .pipe(z.url({ protocol: /^https?$/ })),
});
export type AddSecurityNewsSourceInput = z.infer<typeof addSecurityNewsSourceSchema>;

export const updateSecurityNewsSettingsSchema = z.strictObject({
  /** Whether the research may also search and open sites that aren't listed. */
  searchBeyondSources: z.boolean(),
});
export type UpdateSecurityNewsSettingsInput = z.infer<typeof updateSecurityNewsSettingsSchema>;

// Responses.

export type SecurityNewsSource = { id: string; url: string; createdAt: string };

export type SecurityNewsSourcesResponse = {
  sources: SecurityNewsSource[];
  searchBeyondSources: boolean;
};
