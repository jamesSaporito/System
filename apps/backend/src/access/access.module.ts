import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AccessControl, type Auth, createAuth, Members } from "@portfolio/access";
import { ENV, type Env } from "../env";
import { PrismaService } from "../prisma/prisma.service";
import { HealthController } from "./health.controller";
import { MeController } from "./me.controller";
import { MembersController } from "./members.controller";
import { SessionGuard } from "./session.guard";

/** Better Auth's instance (packages/access); mounted by configureApp. */
export const AUTH = Symbol("AUTH");

/** Wires packages/access into Nest: sign-in, the global guard, and the access routes. */
@Global()
@Module({
  controllers: [MeController, MembersController, HealthController],
  providers: [
    {
      provide: AUTH,
      useFactory: (env: Env, prisma: PrismaService) => createAuth(env, prisma.client),
      inject: [ENV, PrismaService],
    },
    {
      provide: AccessControl,
      useFactory: (env: Env, prisma: PrismaService, auth: Auth) =>
        new AccessControl(env, prisma.client, auth),
      inject: [ENV, PrismaService, AUTH],
    },
    {
      provide: Members,
      useFactory: (prisma: PrismaService, access: AccessControl) =>
        new Members(prisma.client, access),
      inject: [PrismaService, AccessControl],
    },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [AUTH, AccessControl],
})
export class AccessModule {}
