import { prisma } from "@bullhaus/db";
import { json, publicSelect, publicTenantId, publicWhere, toPublic } from "@/lib/public-api";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const tenantId = await publicTenantId();
  if (!tenantId || !/^[\w-]{1,40}$/.test(code)) return json({ error: "No encontrada" }, { status: 404 });
  const row = await prisma.property.findFirst({ where: { ...publicWhere(tenantId), code: code.toUpperCase() }, select: publicSelect });
  if (!row) return json({ error: "No encontrada" }, { status: 404 });
  return json({ property: toPublic(row, { allPhotos: true }) });
}
