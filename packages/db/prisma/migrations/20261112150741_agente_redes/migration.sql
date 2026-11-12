-- CreateEnum
CREATE TYPE "SocialAgentEventKind" AS ENUM ('borrador', 'respuesta_comentario', 'respuesta_mensaje', 'derivacion', 'informe');

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "byAgent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SocialAgentSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "platforms" "SocialPlatform"[] DEFAULT ARRAY['instagram', 'facebook', 'linkedin']::"SocialPlatform"[],
    "postsPerWeek" INTEGER NOT NULL DEFAULT 3,
    "draftNewListings" BOOLEAN NOT NULL DEFAULT true,
    "replyComments" BOOLEAN NOT NULL DEFAULT true,
    "tone" TEXT NOT NULL DEFAULT 'Cercano y profesional. Frases cortas, sin exageraciones ni emojis en exceso.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAgentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAgentEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "SocialAgentEventKind" NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "summary" TEXT NOT NULL,
    "postId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SocialAgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialAgentSetting_tenantId_key" ON "SocialAgentSetting"("tenantId");

-- CreateIndex
CREATE INDEX "SocialAgentEvent_tenantId_at_idx" ON "SocialAgentEvent"("tenantId", "at");

-- AddForeignKey
ALTER TABLE "SocialAgentSetting" ADD CONSTRAINT "SocialAgentSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAgentEvent" ADD CONSTRAINT "SocialAgentEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
