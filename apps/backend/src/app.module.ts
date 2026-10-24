import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { EnvModule } from "./env";
import { HealthController } from "./health/health.controller";
import { MembersModule } from "./members/members.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SitesModule } from "./sites/sites.module";

@Module({
  imports: [EnvModule, PrismaModule, AuthModule, SitesModule, MembersModule],
  controllers: [HealthController],
})
export class AppModule {}
