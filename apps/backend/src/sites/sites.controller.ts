import { Body, ConflictException, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  type CreateSiteInput,
  createSiteSchema,
  type Site,
  type UpdateSiteInput,
  updateSiteSchema,
} from "@portfolio/contracts";
import { RequirePlatformAdmin, RequireSiteRole } from "../auth/access";
import { isUniqueViolation } from "../prisma/errors";
import { PrismaService } from "../prisma/prisma.service";

const siteFields = { id: true, slug: true, name: true, domain: true } as const;

@Controller("sites")
export class SitesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePlatformAdmin()
  list(): Promise<Site[]> {
    return this.prisma.client.site.findMany({ select: siteFields, orderBy: { name: "asc" } });
  }

  @Post()
  @RequirePlatformAdmin()
  async create(@Body({ schema: createSiteSchema }) input: CreateSiteInput): Promise<Site> {
    try {
      return await this.prisma.client.site.create({ data: input, select: siteFields });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException(`A site with slug "${input.slug}" exists`);
      throw error;
    }
  }

  @Patch(":siteId")
  @RequireSiteRole("OWNER")
  update(
    @Param("siteId") siteId: string,
    @Body({ schema: updateSiteSchema }) input: UpdateSiteInput,
  ): Promise<Site> {
    return this.prisma.client.site.update({
      where: { id: siteId },
      data: input,
      select: siteFields,
    });
  }
}
