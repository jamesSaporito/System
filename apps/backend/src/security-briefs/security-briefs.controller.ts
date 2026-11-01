import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { SecurityBrief, SecurityBriefsResponse } from "@portfolio/contracts";
import { z } from "zod";
import { RequireAdmin, RequirePermission } from "../auth/access";
import { SecurityBriefsService } from "./security-briefs.service";
import { SecurityNewsService } from "./security-news.service";

/** The admin's Vulnerability Report tab: browse stored briefs by date. */
@Controller("security-briefs")
@RequirePermission("SECURITY")
export class SecurityBriefsController {
  constructor(
    private readonly briefs: SecurityBriefsService,
    private readonly news: SecurityNewsService,
  ) {}

  @Get()
  list(): Promise<SecurityBriefsResponse> {
    return this.briefs.list();
  }

  /**
   * Writes today's brief now, replacing today's if there is one. A run takes minutes, so this
   * only starts it; the brief shows up in the list when it's stored, and failures are logged.
   */
  @Post("run")
  @RequireAdmin()
  @HttpCode(202)
  run(): { status: "started" } {
    const result = this.news.start();
    if (result === "unconfigured")
      throw new ServiceUnavailableException("ANTHROPIC_API_KEY isn't set");
    if (result === "running") throw new ConflictException("A brief is already being written");
    return { status: "started" };
  }

  @Get(":runOn")
  get(@Param("runOn") runOn: string): Promise<SecurityBrief> {
    const date = z.iso.date().safeParse(runOn);
    if (!date.success) throw new BadRequestException("runOn must be a date like 2026-10-31");
    return this.briefs.get(date.data);
  }
}
