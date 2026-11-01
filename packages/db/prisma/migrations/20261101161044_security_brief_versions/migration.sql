-- DropIndex
DROP INDEX "security_briefs_run_on_key";

-- CreateIndex
CREATE INDEX "security_briefs_run_on_created_at_idx" ON "security_briefs"("run_on", "created_at");
