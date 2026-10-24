import { z } from "zod";
import { siteRoleSchema, type SiteRole } from "./sites";

export const inviteMemberSchema = z.object({
  githubLogin: z
    .string()
    .trim()
    .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, "a GitHub username"),
  role: siteRoleSchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberSchema = z.object({ role: siteRoleSchema });
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export type SiteMember = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: SiteRole;
  createdAt: string;
};

export type SiteInvite = {
  id: string;
  githubLogin: string;
  role: SiteRole;
  createdAt: string;
};

export type MembersResponse = { members: SiteMember[]; invites: SiteInvite[] };

/** Inviting someone who already has an account adds them directly. */
export type InviteResult = { status: "added" } | { status: "invited" };
