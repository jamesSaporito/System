import { Injectable, NotFoundException } from "@nestjs/common";
import {
  type SecurityBrief,
  type SecurityBriefInput,
  type SecurityBriefsResponse,
  securitySourceSchema,
} from "@portfolio/contracts";
import type { SecurityBrief as BriefRow, SecurityBriefItem as ItemRow } from "@portfolio/db";
import type { PreviousBrief, Usage } from "@portfolio/security-news";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";

/** Calendar dates go to and from DATE columns as YYYY-MM-DD. */
const toDate = (iso: string) => new Date(iso);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

const sourcesSchema = z.array(securitySourceSchema);

@Injectable()
export class SecurityBriefsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<SecurityBriefsResponse> {
    const briefs = await this.prisma.client.securityBrief.findMany({
      orderBy: { runOn: "desc" },
      include: { items: { select: { id: true } } },
    });
    return {
      briefs: briefs.map((brief) => ({
        id: brief.id,
        runOn: toIso(brief.runOn),
        coversFrom: toIso(brief.coversFrom),
        coversTo: toIso(brief.coversTo),
        mostUrgent: brief.mostUrgent,
        itemCount: brief.items.length,
        updatedAt: brief.updatedAt.toISOString(),
      })),
    };
  }

  async get(runOn: string): Promise<SecurityBrief> {
    const brief = await this.prisma.client.securityBrief.findUnique({
      where: { runOn: toDate(runOn) },
      // Postgres sorts enums by declaration order: sections in reading order, severities from
      // critical down. Within a section: severity, then CVSS score, then the brief's own order
      // (urgency), which also orders "Worth Knowing", whose items have neither.
      include: {
        items: {
          orderBy: [
            { section: "asc" },
            { severity: { sort: "asc", nulls: "last" } },
            { cvssScore: { sort: "desc", nulls: "last" } },
            { position: "asc" },
          ],
        },
      },
    });
    if (!brief) throw new NotFoundException();
    return toBrief(brief);
  }

  /**
   * The newest brief from before `runOn`, which the run reads so repeats are marked as updates.
   * A rerun on the same day reads the day before's, not the brief it is about to replace.
   */
  async latest(runOn: string): Promise<PreviousBrief | null> {
    const brief = await this.prisma.client.securityBrief.findFirst({
      where: { runOn: { lt: toDate(runOn) } },
      orderBy: { runOn: "desc" },
      select: { runOn: true, markdown: true },
    });
    return brief && { runOn: toIso(brief.runOn), markdown: brief.markdown };
  }

  /** Logs a run, whatever its outcome, with what it cost. */
  async recordRun(run: {
    runOn: string;
    outcome: "STORED" | "NOTHING_NEW" | "FAILED";
    usage: Usage;
    error?: string;
  }): Promise<void> {
    await this.prisma.client.securityBriefRun.create({
      data: {
        runOn: toDate(run.runOn),
        outcome: run.outcome,
        usage: run.usage,
        error: run.error ?? null,
      },
    });
  }

  /** Whether a run for `runOn` stored a brief or found nothing new; failed runs don't count. */
  async ranOn(runOn: string): Promise<boolean> {
    const runs = await this.prisma.client.securityBriefRun.count({
      where: { runOn: toDate(runOn), outcome: { in: ["STORED", "NOTHING_NEW"] } },
    });
    return runs > 0;
  }

  /** Stores a brief by run date; a rerun the same day replaces the brief and all its items. */
  async upsert(input: SecurityBriefInput): Promise<void> {
    const fields = {
      coversFrom: toDate(input.coversFrom),
      coversTo: toDate(input.coversTo),
      mostUrgent: input.mostUrgent,
      markdown: input.markdown,
    };
    await this.prisma.client.$transaction(async (tx) => {
      const brief = await tx.securityBrief.upsert({
        where: { runOn: toDate(input.runOn) },
        create: { runOn: toDate(input.runOn), ...fields },
        update: fields,
      });
      await tx.securityBriefItem.deleteMany({ where: { briefId: brief.id } });

      // `position` is the item's place within its section, in array order.
      const nextPosition = new Map<string, number>();
      await tx.securityBriefItem.createMany({
        data: input.items.map((item) => {
          const position = nextPosition.get(item.section) ?? 0;
          nextPosition.set(item.section, position + 1);
          return {
            briefId: brief.id,
            position,
            section: item.section,
            subject: item.subject,
            title: item.title,
            advisoryIds: item.advisoryIds,
            severity: item.severity,
            cvssScore: item.cvssScore,
            cvssVersion: item.cvssVersion,
            exploitationStatus: item.exploitationStatus,
            kevAddedOn: item.kevAddedOn && toDate(item.kevAddedOn),
            affected: item.affected,
            fix: item.fix,
            publishedOn: item.publishedOn && toDate(item.publishedOn),
            impact: item.impact,
            isUpdate: item.isUpdate,
            updateNote: item.updateNote,
            sources: item.sources,
          };
        }),
      });
    });
  }
}

function toBrief(brief: BriefRow & { items: ItemRow[] }): SecurityBrief {
  return {
    id: brief.id,
    runOn: toIso(brief.runOn),
    coversFrom: toIso(brief.coversFrom),
    coversTo: toIso(brief.coversTo),
    mostUrgent: brief.mostUrgent,
    markdown: brief.markdown,
    updatedAt: brief.updatedAt.toISOString(),
    createdAt: brief.createdAt.toISOString(),
    items: brief.items.map((item) => ({
      id: item.id,
      position: item.position,
      section: item.section,
      subject: item.subject,
      title: item.title,
      advisoryIds: item.advisoryIds,
      severity: item.severity,
      cvssScore: item.cvssScore,
      cvssVersion: item.cvssVersion,
      exploitationStatus: item.exploitationStatus,
      kevAddedOn: item.kevAddedOn && toIso(item.kevAddedOn),
      affected: item.affected,
      fix: item.fix,
      publishedOn: item.publishedOn && toIso(item.publishedOn),
      impact: item.impact,
      isUpdate: item.isUpdate,
      updateNote: item.updateNote,
      sources: sourcesSchema.parse(item.sources),
    })),
  };
}
