-- Tasación comercial por comparables: datos de la propiedad tasada y foto fija de sus comparables.
-- CreateEnum
CREATE TYPE "ValuationStatus" AS ENUM ('borrador', 'entregada');

-- CreateEnum
CREATE TYPE "ComparableSource" AS ENUM ('cierre', 'cartera', 'manual');

-- CreateTable
CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "authorId" TEXT NOT NULL,
    "preparedFor" TEXT,
    "operation" "Operation" NOT NULL,
    "type" "PropertyType" NOT NULL,
    "comuna" TEXT NOT NULL,
    "sector" TEXT,
    "currency" "Currency" NOT NULL,
    "m2Useful" DECIMAL(10,2),
    "m2Land" DECIMAL(12,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "parking" INTEGER,
    "notes" TEXT,
    "status" "ValuationStatus" NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValuationComparable" (
    "id" TEXT NOT NULL,
    "valuationId" TEXT NOT NULL,
    "source" "ComparableSource" NOT NULL,
    "propertyId" TEXT,
    "dealId" TEXT,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "operation" "Operation" NOT NULL,
    "type" "PropertyType" NOT NULL,
    "comuna" TEXT NOT NULL,
    "sector" TEXT,
    "currency" "Currency" NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "m2Useful" DECIMAL(10,2),
    "m2Land" DECIMAL(12,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "observedAt" TIMESTAMP(3),
    "included" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValuationComparable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Valuation_tenantId_createdAt_idx" ON "Valuation"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ValuationComparable_valuationId_idx" ON "ValuationComparable"("valuationId");

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValuationComparable" ADD CONSTRAINT "ValuationComparable_valuationId_fkey" FOREIGN KEY ("valuationId") REFERENCES "Valuation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

