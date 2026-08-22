-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "phone" TEXT,
ADD COLUMN "avatar" TEXT,
ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- Existing databases created by the initial migration may contain NULL names.
UPDATE "User" SET "name" = '' WHERE "name" IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
