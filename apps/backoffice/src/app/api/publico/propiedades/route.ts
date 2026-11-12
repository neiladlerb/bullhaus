import { prisma } from "@bullhaus/db";
import { json, publicSelect, publicTenantId, publicWhere, toPublic } from "@/lib/public-api";

export async function GET() {
  const tenantId = await publicTenantId();
  if (!tenantId) return json({ properties: [] });
  const rows = await prisma.property.findMany({ where: publicWhere(tenantId), select: publicSelect, orderBy: { updatedAt: "desc" } });
  return json({ properties: rows.map((r) => toPublic(r, { allPhotos: false })) });
}
