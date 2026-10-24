import { Controller, Get } from "@nestjs/common";
import type { MeResponse } from "@portfolio/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { type AuthContext, CurrentAuth } from "./access";

@Controller("me")
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentAuth() auth: AuthContext): Promise<MeResponse> {
    const { id, name, email, image } = auth.user;
    const sites = await this.prisma.client.site.findMany({
      where: auth.isPlatformAdmin ? {} : { id: { in: [...auth.memberships.keys()] } },
      select: { id: true, slug: true, name: true, domain: true },
      orderBy: { name: "asc" },
    });
    return {
      user: { id, name, email, image: image ?? null },
      isPlatformAdmin: auth.isPlatformAdmin,
      sites: sites.map((site) => ({ ...site, role: auth.memberships.get(site.id) ?? "OWNER" })),
    };
  }
}
