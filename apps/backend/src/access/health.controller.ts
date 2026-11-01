import { Controller, Get, Logger, ServiceUnavailableException } from "@nestjs/common";
import { checkHealth } from "@portfolio/access";
import type { HealthResponse } from "@portfolio/access/api";
import { PrismaService } from "../prisma/prisma.service";
import { AllowAnonymous } from "./decorators";

@AllowAnonymous()
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const { health, error } = await checkHealth(this.prisma.client);
    if (health.database === "up") return health;
    this.logger.warn(`Database check failed: ${String(error)}`);
    // 503 so load balancer health checks take the instance out of rotation.
    throw new ServiceUnavailableException(health);
  }
}
