import { BrandSchema } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { json, publicTenantId } from "@/lib/public-api";

// Ficha de marca de la corredora para la web pública. Es información pública por definición
// (nombre, logo, contacto, equipo); si la ficha guardada no pasa el esquema, no se entrega.
export async function GET() {
  const tenantId = await publicTenantId();
  if (!tenantId) return json({ brand: null }, { status: 404 });
  const row = await prisma.tenantBrand.findUnique({ where: { tenantId }, select: { data: true } });
  const parsed = BrandSchema.safeParse(row?.data);
  if (!parsed.success) return json({ brand: null }, { status: 404 });
  return json({ brand: parsed.data });
}
