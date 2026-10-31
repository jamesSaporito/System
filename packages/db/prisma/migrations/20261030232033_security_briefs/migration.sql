-- CreateEnum
CREATE TYPE "security_brief_section" AS ENUM ('actively_exploited', 'critical_and_high', 'worth_knowing');

-- CreateEnum
CREATE TYPE "security_severity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateTable
CREATE TABLE "security_briefs" (
    "id" TEXT NOT NULL,
    "run_on" DATE NOT NULL,
    "covers_from" DATE NOT NULL,
    "covers_to" DATE NOT NULL,
    "most_urgent" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_brief_items" (
    "id" TEXT NOT NULL,
    "brief_id" TEXT NOT NULL,
    "section" "security_brief_section" NOT NULL,
    "position" INTEGER NOT NULL,
    "product" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "advisory_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "severity" "security_severity",
    "cvss_score" DOUBLE PRECISION,
    "cvss_version" TEXT,
    "exploitation_status" TEXT,
    "kev_added_on" DATE,
    "affected" TEXT,
    "fix" TEXT,
    "published_on" DATE,
    "why_it_matters" TEXT,
    "is_update" BOOLEAN NOT NULL DEFAULT false,
    "update_note" TEXT,
    "sources" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_brief_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_briefs_run_on_key" ON "security_briefs"("run_on");

-- CreateIndex
CREATE UNIQUE INDEX "security_brief_items_brief_id_section_position_key" ON "security_brief_items"("brief_id", "section", "position");

-- AddForeignKey
ALTER TABLE "security_brief_items" ADD CONSTRAINT "security_brief_items_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "security_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
