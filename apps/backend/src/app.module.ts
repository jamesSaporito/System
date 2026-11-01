import { Module } from "@nestjs/common";
import { AccessModule } from "./access/access.module";
import { EnvModule } from "./env";
import { PrismaModule } from "./prisma/prisma.module";
import { SecurityBriefModule } from "./security-brief/security-brief.module";

/** Composition only: each feature's behaviour lives in its package (packages/access, …). */
@Module({ imports: [EnvModule, PrismaModule, AccessModule, SecurityBriefModule] })
export class AppModule {}
