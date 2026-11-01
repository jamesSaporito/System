import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaBriefStore, SecurityBriefRunner } from "@portfolio/security-brief";
import {
  type RunSecurityBriefInput,
  runSecurityBriefSchema,
  type SecurityBriefDayResponse,
  type SecurityBriefDaysResponse,
  type SecurityBriefStatusResponse,
} from "@portfolio/security-brief/api";
import { z } from "zod";
import { RequireAdmin, RequirePermission } from "../access/decorators";

/** The admin's Vulnerability Report tab: browse the brief's items by day. */
@Controller("security-briefs")
@RequirePermission("SECURITY")
export class SecurityBriefsController {
  constructor(
    private readonly briefs: PrismaBriefStore,
    private readonly runner: SecurityBriefRunner,
  ) {}

  @Get()
  days(): Promise<SecurityBriefDaysResponse> {
    return this.briefs.days();
  }

  /**
   * Reads the feeds and writes what's new now. A run can take minutes, so this only starts it;
   * the admin polls `status` for how it ended. `fullDay` reads at least the last 24 hours of
   * every source instead of starting at its cursor.
   */
  @Post("run")
  @RequireAdmin()
  @HttpCode(202)
  run(@Body({ schema: runSecurityBriefSchema }) input: RunSecurityBriefInput): {
    status: "started";
  } {
    const result = this.runner.start({ fullDay: input.fullDay });
    if (result === "unconfigured")
      throw new ServiceUnavailableException("ANTHROPIC_API_KEY isn't set");
    if (result === "running") throw new ConflictException("A brief is already being written");
    return { status: "started" };
  }

  /**
   * Whether a run is going and how the last one ended, which the admin polls while one runs.
   * Declared before `:day` so "status" isn't read as a date.
   */
  @Get("status")
  @RequireAdmin()
  async status(): Promise<SecurityBriefStatusResponse> {
    const startedAt = this.runner.runningSince();
    return {
      running: startedAt && { startedAt: startedAt.toISOString() },
      lastRun: await this.briefs.lastRun(),
    };
  }

  /** The day's items: first seen that day, or updated that day. */
  @Get(":day")
  async day(@Param("day") day: string): Promise<SecurityBriefDayResponse> {
    const date = z.iso.date().safeParse(day);
    if (!date.success) throw new BadRequestException("day must be a date like 2026-10-31");
    const found = await this.briefs.day(date.data);
    if (!found) throw new NotFoundException();
    return found;
  }
}
