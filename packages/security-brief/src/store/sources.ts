import { isNotFound, isUniqueViolation, type PrismaClient } from "@portfolio/db";
import type { SecurityNewsFeed, SecurityNewsFeedsResponse } from "../api/sources";
import type { FeedCollection, FeedCursors } from "../feeds/feeds";

/** The settings row, which holds the KEV and GitHub cursors. */
const SETTINGS_ID = 1;

const toResponse = (row: {
  id: string;
  url: string;
  createdAt: Date;
  fetchedAt: Date | null;
}): SecurityNewsFeed => ({
  id: row.id,
  url: row.url,
  createdAt: row.createdAt.toISOString(),
  fetchedAt: row.fetchedAt?.toISOString() ?? null,
});

/** The news feeds the brief reads, and where each source was last read up to. */
export type SourcesStore = {
  feeds: () => Promise<SecurityNewsFeedsResponse>;
  /** "exists" when the feed is already listed. */
  addFeed: (url: string) => Promise<SecurityNewsFeed | "exists">;
  /** False when there's no such feed. */
  removeFeed: (id: string) => Promise<boolean>;
  cursors: () => Promise<FeedCursors>;
  /** Moves the cursors of the sources read in full to `at`, when their read started. */
  advanceCursors: (read: FeedCollection["read"], at: Date) => Promise<void>;
};

/** The feeds and cursors in Postgres (security_news_feeds, security_news_settings). */
export class PrismaSourcesStore implements SourcesStore {
  constructor(private readonly prisma: PrismaClient) {}

  async feeds(): Promise<SecurityNewsFeedsResponse> {
    const feeds = await this.prisma.securityNewsFeed.findMany({
      orderBy: { createdAt: "asc" },
    });
    return { feeds: feeds.map(toResponse) };
  }

  async addFeed(url: string): Promise<SecurityNewsFeed | "exists"> {
    try {
      return toResponse(await this.prisma.securityNewsFeed.create({ data: { url } }));
    } catch (error) {
      if (isUniqueViolation(error)) return "exists";
      throw error;
    }
  }

  async removeFeed(id: string): Promise<boolean> {
    try {
      await this.prisma.securityNewsFeed.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  }

  async cursors(): Promise<FeedCursors> {
    const [settings, feeds] = await Promise.all([
      this.prisma.securityNewsSettings.findUnique({ where: { id: SETTINGS_ID } }),
      this.prisma.securityNewsFeed.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    return {
      kev: settings?.kevFetchedAt ?? null,
      advisories: settings?.advisoriesFetchedAt ?? null,
      feeds: feeds.map((feed) => ({ url: feed.url, fetchedAt: feed.fetchedAt })),
    };
  }

  /** Moves the cursors of the sources read in full to `at`, when their read started. */
  async advanceCursors(read: FeedCollection["read"], at: Date): Promise<void> {
    const settings = {
      ...(read.kev ? { kevFetchedAt: at } : {}),
      ...(read.advisories ? { advisoriesFetchedAt: at } : {}),
    };
    await this.prisma.$transaction([
      this.prisma.securityNewsSettings.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, ...settings },
        update: settings,
      }),
      this.prisma.securityNewsFeed.updateMany({
        where: { url: { in: read.feeds } },
        data: { fetchedAt: at },
      }),
    ]);
  }
}
