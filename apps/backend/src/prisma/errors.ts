import { Prisma } from "@portfolio/db";

/** True when a write failed on a unique constraint. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
