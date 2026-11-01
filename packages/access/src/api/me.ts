import type { Permission } from "./permissions";

export type MeResponse = {
  user: { id: string; name: string; email: string; image: string | null };
  /** Listed in ADMIN_GITHUB_IDS; admins manage members. */
  isAdmin: boolean;
  /** The tabs they can open; admins hold all of them. */
  permissions: Permission[];
};
