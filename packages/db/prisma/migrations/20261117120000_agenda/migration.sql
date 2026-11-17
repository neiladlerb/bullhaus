-- Agenda de corredores (visitas, tasaciones, llamadas, reuniones y firmas), horario de cada corredor e hitos
-- de cada propiedad hasta la venta o el arriendo.

CREATE TYPE "AppointmentKind" AS ENUM ('visita', 'tasacion', 'llamada', 'reunion', 'firma', 'otro');
CREATE TYPE "AppointmentStatus" AS ENUM ('por_confirmar', 'confirmada', 'realizada', 'no_asistio', 'cancelada');
CREATE TYPE "AppointmentSource" AS ENUM ('web', 'backoffice', 'whatsapp');

ALTER TABLE "User" ADD COLUMN "availability" JSONB;

CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "AppointmentKind" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'confirmada',
    "source" "AppointmentSource" NOT NULL DEFAULT 'backoffice',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "brokerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "leadId" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyMilestone" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMilestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Appointment_tenantId_brokerId_startsAt_idx" ON "Appointment"("tenantId", "brokerId", "startsAt");
CREATE INDEX "Appointment_tenantId_startsAt_idx" ON "Appointment"("tenantId", "startsAt");
CREATE UNIQUE INDEX "PropertyMilestone_propertyId_key_key" ON "PropertyMilestone"("propertyId", "key");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PropertyMilestone" ADD CONSTRAINT "PropertyMilestone_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
