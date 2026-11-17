import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AttributionSchema } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { brokerSlots, slotStillFree, visitSettings } from "@/lib/agenda";
import { publicTenantId, publicWhere } from "@/lib/public-api";

// Agendar visita desde la web, sin escribirle a nadie. Solo la web (servidor a servidor, clave WEB_API_KEY).
// GET: horarios libres del corredor a cargo de la propiedad. POST: toma un horario.
// Reglas (CLAUDE.md): nunca se agenda sin nombre ni sin confirmación explícita del horario por el contacto; solo
// propiedades disponibles y publicadas; la dirección exacta no sale aquí (la envía el corredor al confirmar).

function authorized(req: Request): boolean {
  const key = process.env.WEB_API_KEY;
  const got = req.headers.get("x-web-key") ?? "";
  if (!key || got.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(key));
}

async function findProperty(tenantId: string, code: string) {
  return prisma.property.findFirst({
    where: { ...publicWhere(tenantId), code: code.toUpperCase() },
    select: { id: true, code: true, brokerId: true, operation: true, comuna: true, price: true, currency: true },
  });
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const code = new URL(req.url).searchParams.get("codigo") ?? "";
  const tenantId = await publicTenantId();
  if (!tenantId) return Response.json({ error: "No disponible" }, { status: 503 });
  const property = code ? await findProperty(tenantId, code) : null;
  if (!property) return Response.json({ error: "Propiedad no encontrada" }, { status: 404 });
  const [days, settings] = await Promise.all([brokerSlots(tenantId, property.brokerId), visitSettings(tenantId)]);
  return Response.json(
    { durationMin: settings.durationMin, days: days.map((d) => ({ day: d.day, slots: d.slots.map((s) => s.toISOString()) })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const schema = z.object({
  propertyCode: z.string().trim().min(1).max(40),
  start: z.string().datetime(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30).regex(/^[+\d\s()-]+$/),
  email: z.string().trim().email().max(160).optional().or(z.literal("").transform(() => undefined)),
  consent: z.literal(true),
  // El contacto vio el día y la hora y apretó "Confirmar visita": sin esto no se agenda.
  confirmed: z.literal(true),
  attribution: AttributionSchema.optional(),
});

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  const tenantId = await publicTenantId();
  if (!tenantId) return Response.json({ error: "No disponible" }, { status: 503 });
  const d = parsed.data;
  const property = await findProperty(tenantId, d.propertyCode);
  if (!property) return Response.json({ error: "Propiedad no encontrada" }, { status: 404 });

  const start = new Date(d.start);
  const { durationMin } = await visitSettings(tenantId);
  const end = new Date(start.getTime() + durationMin * 60_000);

  const result = await prisma.$transaction(async (tx) => {
    // Un candado por corredor: dos personas que eligen el mismo horario al mismo tiempo no quedan las dos agendadas.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${property.brokerId}))`;
    if (!(await slotStillFree(tenantId, property.brokerId, start, new Date(), tx))) return { taken: true as const };

    const lead = await tx.lead.create({
      data: {
        tenantId,
        kind: property.operation === "arriendo" ? "arrendatario" : "comprador",
        source: "web",
        stage: "visita",
        name: d.name,
        phone: d.phone,
        email: d.email ?? null,
        comuna: property.comuna,
        interest: `Visita agendada desde la web a ${property.code}`,
        propertyId: property.id,
        brokerId: property.brokerId,
        budget: property.price,
        budgetCurrency: property.currency,
        ...(d.attribution ?? {}),
        events: { create: { toStage: "visita", note: "Agendó la visita desde la web" } },
      },
    });
    const appt = await tx.appointment.create({
      data: {
        tenantId,
        kind: "visita",
        status: "por_confirmar",
        source: "web",
        startsAt: start,
        endsAt: end,
        brokerId: property.brokerId,
        propertyId: property.id,
        leadId: lead.id,
        contactName: d.name,
        contactPhone: d.phone,
      },
    });
    return { taken: false as const, id: appt.id };
  });

  if (result.taken) return Response.json({ error: "Ese horario se acaba de ocupar" }, { status: 409 });
  return Response.json({ ok: true, start: start.toISOString() });
}
