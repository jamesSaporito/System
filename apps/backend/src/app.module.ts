import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { EnvModule } from "./env";
import { HealthController } from "./health/health.controller";
import { MembersModule } from "./members/members.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SecurityBriefsModule } from "./security-briefs/security-briefs.module";

@Module({
  imports: [EnvModule, PrismaModule, AuthModule, MembersModule, SecurityBriefsModule],
  controllers: [HealthController],
})
export class AppModule {}
