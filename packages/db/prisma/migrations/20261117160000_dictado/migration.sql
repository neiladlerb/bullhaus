-- Dictado del corredor: texto dictado, datos propuestos con su frase de origen y borrador de descripción.
-- CreateEnum
CREATE TYPE "DictationStatus" AS ENUM ('borrador', 'aplicado');

-- CreateTable
CREATE TABLE "PropertyDictation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "extracted" JSONB,
    "engine" TEXT,
    "descriptionDraft" TEXT,
    "status" "DictationStatus" NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyDictation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyDictation_propertyId_createdAt_idx" ON "PropertyDictation"("propertyId", "createdAt");

-- AddForeignKey
ALTER TABLE "PropertyDictation" ADD CONSTRAINT "PropertyDictation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDictation" ADD CONSTRAINT "PropertyDictation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

