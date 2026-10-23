import { Controller, Get, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "./session.guard";

@Controller("me")
export class MeController {
  @Get()
  me(@Req() request: AuthenticatedRequest) {
    const { id, name, email, image, role } = request.authSession.user;
    return { id, name, email, image, role };
  }
}
