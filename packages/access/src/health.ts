import type { PrismaClient } from "@portfolio/db";
import type { HealthResponse } from "./api/health";

/** Whether the database answers; `error` says why not, for the app's logs. */
export async function checkHealth(
  prisma: PrismaClient,
): Promise<{ health: HealthResponse; error?: unknown }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { health: { status: "ok", database: "up" } };
  } catch (error) {
    return { health: { status: "degraded", database: "down" }, error };
  }
}
