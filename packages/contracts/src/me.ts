export type MeResponse = {
  user: { id: string; name: string; email: string; image: string | null };
  /** Listed in ADMIN_GITHUB_IDS; admins manage members. */
  isAdmin: boolean;
};
