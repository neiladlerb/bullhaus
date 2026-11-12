import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@bullhaus/db";
import { publicTenantId, publicWhere } from "@/lib/public-api";

// Formularios de la web pública: crean un lead "web". Solo la web (servidor a servidor)
// puede llamar, con la clave WEB_API_KEY. No se registra el mensaje en los logs.

const schema = z.object({
  kind: z.enum(["comprador", "arrendatario", "propietario"]),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30).regex(/^[+\d\s()-]+$/),
  email: z.string().trim().email().max(160).optional().or(z.literal("").transform(() => undefined)),
  comuna: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1500).optional(),
  propertyCode: z.string().trim().max(40).optional(),
  consent: z.literal(true),
});

function authorized(req: Request): boolean {
  const key = process.env.WEB_API_KEY;
  const got = req.headers.get("x-web-key") ?? "";
  if (!key || got.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(key));
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  const tenantId = await publicTenantId();
  if (!tenantId) return Response.json({ error: "No disponible" }, { status: 503 });
  const d = parsed.data;

  const property = d.propertyCode
    ? await prisma.property.findFirst({ where: { ...publicWhere(tenantId), code: d.propertyCode.toUpperCase() }, select: { id: true, brokerId: true, comuna: true, price: true, currency: true } })
    : null;

  await prisma.lead.create({
    data: {
      tenantId,
      kind: d.kind,
      source: "web",
      name: d.name,
      phone: d.phone,
      email: d.email ?? null,
      comuna: d.comuna ?? property?.comuna ?? null,
      interest: d.message?.slice(0, 300) ?? null,
      notes: d.message ?? null,
      propertyId: property?.id ?? null,
      brokerId: property?.brokerId ?? null,
      budget: property?.price ?? null,
      budgetCurrency: property?.currency ?? null,
    },
  });
  return Response.json({ ok: true });
}
