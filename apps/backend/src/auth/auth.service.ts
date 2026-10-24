import { Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../env";
import { PrismaService } from "../prisma/prisma.service";
import { type Auth, createAuth } from "./auth";

@Injectable()
export class AuthService {
  readonly auth: Auth;

  constructor(@Inject(ENV) env: Env, prisma: PrismaService) {
    this.auth = createAuth(env, prisma.client);
  }
}
