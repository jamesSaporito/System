import { z } from "zod";

export const addMemberSchema = z.object({
  githubLogin: z
    .string()
    .trim()
    .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, "a GitHub username"),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export type Member = {
  id: string;
  githubLogin: string;
  createdAt: string;
  /** Null until they first sign in. */
  user: { name: string; image: string | null } | null;
};

export type MembersResponse = { members: Member[] };
