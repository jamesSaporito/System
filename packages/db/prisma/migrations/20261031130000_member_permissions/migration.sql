-- CreateEnum
CREATE TYPE "permission" AS ENUM ('dashboard', 'sessions', 'security');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "permissions" "permission"[] DEFAULT ARRAY[]::"permission"[];
