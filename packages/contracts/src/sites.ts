import { z } from "zod";

/** Matches the Prisma SiteRole enum. Owners publish and manage members; editors edit content. */
export const siteRoleSchema = z.enum(["OWNER", "EDITOR"]);
export type SiteRole = z.infer<typeof siteRoleSchema>;

/** Also the folder name of the site's frontend app, sites/<slug>. */
export const siteSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, numbers, and single dashes");

const domainSchema = z
  .string()
  .regex(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
    "a hostname like www.example.com",
  )
  .nullable();

export const createSiteSchema = z.object({
  slug: siteSlugSchema,
  name: z.string().trim().min(1).max(100),
  domain: domainSchema.optional(),
});
export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export const updateSiteSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  domain: domainSchema.optional(),
});
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;

export type Site = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
};

/** A site as seen by the current user. Platform admins act as owners everywhere. */
export type SiteWithRole = Site & { role: SiteRole };

export type MeResponse = {
  user: { id: string; name: string; email: string; image: string | null };
  isPlatformAdmin: boolean;
  sites: SiteWithRole[];
};
