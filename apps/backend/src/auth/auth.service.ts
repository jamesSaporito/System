import { Injectable } from "@nestjs/common";
import { loadEnv } from "../env";
import { PrismaService } from "../prisma/prisma.service";
import { type Auth, createAuth } from "./auth";

@Injectable()
export class AuthService {
  readonly auth: Auth;

  constructor(prisma: PrismaService) {
    this.auth = createAuth(loadEnv(), prisma.client);
  }
}
