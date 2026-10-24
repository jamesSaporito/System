import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AccessService } from "./access.service";
import { AuthService } from "./auth.service";
import { MeController } from "./me.controller";
import { SessionGuard } from "./session.guard";

@Global()
@Module({
  controllers: [MeController],
  providers: [AuthService, AccessService, { provide: APP_GUARD, useClass: SessionGuard }],
  exports: [AuthService, AccessService],
})
export class AuthModule {}
