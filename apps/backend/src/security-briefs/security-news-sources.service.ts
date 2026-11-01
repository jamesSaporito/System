import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  SecurityNewsSource,
  SecurityNewsSourcesResponse,
  UpdateSecurityNewsSettingsInput,
} from "@portfolio/contracts";
import { MAX_ALLOWED_DOMAINS, type ResearchSources } from "@portfolio/security-news";
import { PrismaService } from "../prisma/prisma.service";
import { isNotFound, isUniqueViolation } from "../prisma/errors";

/** The settings row; the migration creates it, and the defaults stand in if it's missing. */
const SETTINGS_ID = 1;

/** The sites the brief's research uses, and whether it may use others too. */
@Injectable()
export class SecurityNewsSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<SecurityNewsSourcesResponse> {
    const [sources, searchBeyondSources] = await Promise.all([
      this.prisma.client.securityNewsSource.findMany({ orderBy: { createdAt: "asc" } }),
      this.searchBeyondSources(),
    ]);
    return {
      sources: sources.map((source): SecurityNewsSource => ({
        id: source.id,
        url: source.url,
        createdAt: source.createdAt.toISOString(),
      })),
      searchBeyondSources,
    };
  }

  /** What a run is given (see runBrief). */
  async forResearch(): Promise<ResearchSources> {
    const { sources, searchBeyondSources } = await this.list();
    return { urls: sources.map((source) => source.url), searchBeyondSources };
  }

  async add(url: string): Promise<SecurityNewsSource> {
    // The web tools take at most this many domains when limited to the listed sites.
    if ((await this.prisma.client.securityNewsSource.count()) >= MAX_ALLOWED_DOMAINS) {
      throw new BadRequestException(`At most ${MAX_ALLOWED_DOMAINS} sites can be listed`);
    }
    try {
      const source = await this.prisma.client.securityNewsSource.create({ data: { url } });
      return { id: source.id, url: source.url, createdAt: source.createdAt.toISOString() };
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("That site is already listed");
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const count = await this.prisma.client.securityNewsSource.count();
    if (count === 1 && !(await this.searchBeyondSources())) {
      throw new BadRequestException(
        "This is the only site the research can use; let it use other sites first",
      );
    }
    try {
      await this.prisma.client.securityNewsSource.delete({ where: { id } });
    } catch (error) {
      if (isNotFound(error)) throw new NotFoundException();
      throw error;
    }
  }

  async updateSettings(
    input: UpdateSecurityNewsSettingsInput,
  ): Promise<SecurityNewsSourcesResponse> {
    if (!input.searchBeyondSources && (await this.prisma.client.securityNewsSource.count()) === 0) {
      throw new BadRequestException("Add a site first: the research would have nothing to use");
    }
    await this.prisma.client.securityNewsSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...input },
      update: input,
    });
    return this.list();
  }

  private async searchBeyondSources(): Promise<boolean> {
    const settings = await this.prisma.client.securityNewsSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    return settings?.searchBeyondSources ?? true;
  }
}
