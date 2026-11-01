-- The brief now stores feed entries as fetched and writes items from them, so items no longer
-- belong to a per-run brief, and the web search method goes away. The existing items were
-- written by the old per-run method and can't be linked to entries, so they're removed (the
-- backend wasn't deployed yet, so this only affects local data). Run history is kept.
DELETE FROM "security_brief_items";

-- CreateEnum
CREATE TYPE "security_feed_source" AS ENUM ('kev', 'github', 'news');

-- DropForeignKey
ALTER TABLE "security_brief_items" DROP CONSTRAINT "security_brief_items_brief_id_fkey";

-- DropIndex
DROP INDEX "security_brief_items_brief_id_section_position_key";

-- AlterTable
ALTER TABLE "security_brief_items" DROP COLUMN "brief_id",
DROP COLUMN "is_update",
DROP COLUMN "position",
ADD COLUMN     "exploited_in_the_wild" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "first_seen_on" DATE NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_on" DATE;

-- AlterTable
ALTER TABLE "security_brief_runs" DROP COLUMN "method",
ADD COLUMN     "feed_failures" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "new_entries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "new_items" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_items" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "security_news_feeds" ADD COLUMN     "fetched_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "security_news_settings" DROP COLUMN "method",
DROP COLUMN "search_beyond_sources",
ADD COLUMN     "advisories_fetched_at" TIMESTAMP(3),
ADD COLUMN     "kev_fetched_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "security_briefs";

-- DropTable
DROP TABLE "security_news_sources";

-- DropEnum
DROP TYPE "security_news_method";

-- CreateTable
CREATE TABLE "security_feed_entries" (
    "id" TEXT NOT NULL,
    "source" "security_feed_source" NOT NULL,
    "external_id" TEXT NOT NULL,
    "advisory_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_on" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "item_id" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_feed_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_feed_entries_item_id_idx" ON "security_feed_entries"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "security_feed_entries_source_external_id_key" ON "security_feed_entries"("source", "external_id");

-- CreateIndex
CREATE INDEX "security_brief_items_first_seen_on_idx" ON "security_brief_items"("first_seen_on");

-- CreateIndex
CREATE INDEX "security_brief_items_updated_on_idx" ON "security_brief_items"("updated_on");

-- AddForeignKey
ALTER TABLE "security_feed_entries" ADD CONSTRAINT "security_feed_entries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "security_brief_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

