-- DropForeignKey
ALTER TABLE "site_invites" DROP CONSTRAINT "site_invites_invited_by_id_fkey";

-- DropForeignKey
ALTER TABLE "site_invites" DROP CONSTRAINT "site_invites_site_id_fkey";

-- DropForeignKey
ALTER TABLE "site_members" DROP CONSTRAINT "site_members_site_id_fkey";

-- DropForeignKey
ALTER TABLE "site_members" DROP CONSTRAINT "site_members_user_id_fkey";

-- DropTable
DROP TABLE "site_invites";

-- DropTable
DROP TABLE "site_members";

-- DropTable
DROP TABLE "sites";

-- DropEnum
DROP TYPE "site_role";

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "github_id" TEXT NOT NULL,
    "github_login" TEXT NOT NULL,
    "added_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_github_id_key" ON "members"("github_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

