-- CreateEnum
CREATE TYPE "BrochureKind" AS ENUM ('captacion', 'venta', 'arriendo');

-- CreateEnum
CREATE TYPE "BrochureStatus" AS ENUM ('borrador', 'en_revision', 'aprobado', 'archivado');

-- CreateEnum
CREATE TYPE "ShareChannel" AS ENUM ('whatsapp', 'instagram', 'facebook', 'linkedin', 'email', 'enlace');

-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('llamar', 'whatsapp', 'email', 'visita', 'seguimiento');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pendiente', 'hecho', 'cancelado');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadSource" ADD VALUE 'linkedin';
ALTER TYPE "LeadSource" ADD VALUE 'email';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "brochureId" TEXT;

-- CreateTable
CREATE TABLE "Brochure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "BrochureKind" NOT NULL,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "token" TEXT NOT NULL,
    "status" "BrochureStatus" NOT NULL DEFAULT 'borrador',
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brochure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrochureShare" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brochureId" TEXT NOT NULL,
    "channel" "ShareChannel" NOT NULL,
    "leadId" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "opens" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BrochureShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "ownerId" TEXT,
    "kind" "TaskKind" NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "templateKey" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'pendiente',
    "doneAt" TIMESTAMP(3),
    "note" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brochure_token_key" ON "Brochure"("token");

-- CreateIndex
CREATE INDEX "Brochure_tenantId_status_idx" ON "Brochure"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BrochureShare_brochureId_sentAt_idx" ON "BrochureShare"("brochureId", "sentAt");

-- CreateIndex
CREATE INDEX "LeadTask_tenantId_status_dueAt_idx" ON "LeadTask"("tenantId", "status", "dueAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_brochureId_fkey" FOREIGN KEY ("brochureId") REFERENCES "Brochure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brochure" ADD CONSTRAINT "Brochure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brochure" ADD CONSTRAINT "Brochure_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrochureShare" ADD CONSTRAINT "BrochureShare_brochureId_fkey" FOREIGN KEY ("brochureId") REFERENCES "Brochure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrochureShare" ADD CONSTRAINT "BrochureShare_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTask" ADD CONSTRAINT "LeadTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTask" ADD CONSTRAINT "LeadTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTask" ADD CONSTRAINT "LeadTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
