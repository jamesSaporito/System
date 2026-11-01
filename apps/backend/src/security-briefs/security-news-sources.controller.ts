import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  type AddSecurityNewsSourceInput,
  addSecurityNewsSourceSchema,
  type SecurityNewsSource,
  type SecurityNewsSourcesResponse,
  type UpdateSecurityNewsSettingsInput,
  updateSecurityNewsSettingsSchema,
} from "@portfolio/contracts";
import { RequireAdmin } from "../auth/access";
import { SecurityNewsSourcesService } from "./security-news-sources.service";

/**
 * The sites the security brief's research uses, edited in the admin's Vulnerability Report tab.
 * Its own path: under /security-briefs, "sources" would be read as a run date.
 */
@Controller("security-news")
@RequireAdmin()
export class SecurityNewsSourcesController {
  constructor(private readonly sources: SecurityNewsSourcesService) {}

  @Get("sources")
  list(): Promise<SecurityNewsSourcesResponse> {
    return this.sources.list();
  }

  @Post("sources")
  add(
    @Body({ schema: addSecurityNewsSourceSchema }) input: AddSecurityNewsSourceInput,
  ): Promise<SecurityNewsSource> {
    return this.sources.add(input.url);
  }

  @Delete("sources/:id")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.sources.remove(id);
  }

  @Patch("settings")
  updateSettings(
    @Body({ schema: updateSecurityNewsSettingsSchema }) input: UpdateSecurityNewsSettingsInput,
  ): Promise<SecurityNewsSourcesResponse> {
    return this.sources.updateSettings(input);
  }
}
