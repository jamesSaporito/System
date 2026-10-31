import { Controller, Get } from "@nestjs/common";
import type { MeResponse } from "@portfolio/contracts";
import { type AuthContext, CurrentAuth } from "./access";

@Controller("me")
export class MeController {
  @Get()
  me(@CurrentAuth() auth: AuthContext): MeResponse {
    const { id, name, email, image } = auth.user;
    return { user: { id, name, email, image: image ?? null }, isAdmin: auth.isAdmin };
  }
}
