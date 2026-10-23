import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createPrismaClient, type PrismaClient } from "@portfolio/db";
import { loadEnv } from "../env";

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient = createPrismaClient(loadEnv().DATABASE_URL);

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
