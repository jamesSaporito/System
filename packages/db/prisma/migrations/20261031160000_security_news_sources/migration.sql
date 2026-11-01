-- Renamed (not dropped and re-added) so stored briefs keep their data.
ALTER TABLE "security_brief_items" RENAME COLUMN "product" TO "subject";
ALTER TABLE "security_brief_items" RENAME COLUMN "why_it_matters" TO "impact";

-- Readable text starts with a capital letter; existing rows are brought in line.
UPDATE "security_briefs" SET "most_urgent" = upper(left("most_urgent", 1)) || substr("most_urgent", 2) WHERE "most_urgent" ~ '^[a-z]';
UPDATE "security_brief_items" SET "title" = upper(left("title", 1)) || substr("title", 2) WHERE "title" ~ '^[a-z]';
UPDATE "security_brief_items" SET "exploitation_status" = upper(left("exploitation_status", 1)) || substr("exploitation_status", 2) WHERE "exploitation_status" ~ '^[a-z]';
UPDATE "security_brief_items" SET "affected" = upper(left("affected", 1)) || substr("affected", 2) WHERE "affected" ~ '^[a-z]';
UPDATE "security_brief_items" SET "fix" = upper(left("fix", 1)) || substr("fix", 2) WHERE "fix" ~ '^[a-z]';
UPDATE "security_brief_items" SET "impact" = upper(left("impact", 1)) || substr("impact", 2) WHERE "impact" ~ '^[a-z]';
UPDATE "security_brief_items" SET "update_note" = upper(left("update_note", 1)) || substr("update_note", 2) WHERE "update_note" ~ '^[a-z]';

-- CreateEnum
CREATE TYPE "security_brief_run_outcome" AS ENUM ('stored', 'nothing_new', 'failed');

-- CreateTable
CREATE TABLE "security_brief_runs" (
    "id" TEXT NOT NULL,
    "run_on" DATE NOT NULL,
    "outcome" "security_brief_run_outcome" NOT NULL,
    "error" TEXT,
    "usage" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_brief_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_news_sources" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_news_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_news_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "search_beyond_sources" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "security_news_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_brief_runs_run_on_idx" ON "security_brief_runs"("run_on");

-- CreateIndex
CREATE UNIQUE INDEX "security_news_sources_url_key" ON "security_news_sources"("url");

-- The sites the research prompt named before they became configurable (Ars Technica is left out:
-- it blocks Anthropic's crawler, so web search and fetch can't use it). Each URL was confirmed in
-- web search results on 2026-10-31.
INSERT INTO "security_news_sources" ("id", "url") VALUES
    (uuidv7()::text, 'https://www.bleepingcomputer.com/news/security/'),
    (uuidv7()::text, 'https://thehackernews.com/'),
    (uuidv7()::text, 'https://www.securityweek.com/news/'),
    (uuidv7()::text, 'https://www.theregister.com/security'),
    (uuidv7()::text, 'https://www.helpnetsecurity.com/'),
    (uuidv7()::text, 'https://www.darkreading.com/vulnerabilities-threats'),
    (uuidv7()::text, 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog'),
    (uuidv7()::text, 'https://github.com/advisories'),
    (uuidv7()::text, 'https://nvd.nist.gov/vuln/search');

INSERT INTO "security_news_settings" ("id", "search_beyond_sources") VALUES (1, true);
