-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('borrador', 'en_revision', 'aprobado', 'publicado', 'rechazado');

-- AlterEnum
ALTER TYPE "SocialPlatform" ADD VALUE 'linkedin';

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "series" TEXT,
ADD COLUMN     "status" "SocialPostStatus" NOT NULL DEFAULT 'publicado',
ADD COLUMN     "title" TEXT,
ADD COLUMN     "topic" TEXT,
ALTER COLUMN "publishedAt" DROP NOT NULL,
ALTER COLUMN "reach" SET DEFAULT 0,
ALTER COLUMN "impressions" SET DEFAULT 0,
ALTER COLUMN "likes" SET DEFAULT 0,
ALTER COLUMN "comments" SET DEFAULT 0,
ALTER COLUMN "saves" SET DEFAULT 0,
ALTER COLUMN "shares" SET DEFAULT 0;
