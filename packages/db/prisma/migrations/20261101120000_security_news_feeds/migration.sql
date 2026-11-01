-- CreateEnum
CREATE TYPE "security_news_method" AS ENUM ('feeds', 'web_search');

-- Every run before this one used web search; new runs always say which method they used.
ALTER TABLE "security_brief_runs" ADD COLUMN "method" "security_news_method" NOT NULL DEFAULT 'web_search';
ALTER TABLE "security_brief_runs" ALTER COLUMN "method" DROP DEFAULT;

-- AlterTable
ALTER TABLE "security_news_settings" ADD COLUMN "method" "security_news_method" NOT NULL DEFAULT 'feeds';

-- CreateTable
CREATE TABLE "security_news_feeds" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_news_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_news_feeds_url_key" ON "security_news_feeds"("url");

-- The news sites' own RSS/Atom feeds, the feeds counterpart of security_news_sources' seed.
INSERT INTO "security_news_feeds" ("id", "url") VALUES
    (uuidv7()::text, 'https://www.bleepingcomputer.com/feed/'),
    (uuidv7()::text, 'https://feeds.feedburner.com/TheHackersNews'),
    (uuidv7()::text, 'https://www.securityweek.com/feed/'),
    (uuidv7()::text, 'https://www.theregister.com/security/headlines.atom'),
    (uuidv7()::text, 'https://www.helpnetsecurity.com/feed/'),
    (uuidv7()::text, 'https://www.darkreading.com/rss.xml');
