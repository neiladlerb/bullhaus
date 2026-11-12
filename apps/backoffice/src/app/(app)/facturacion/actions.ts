"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { emitTaxDocument, ProviderNotConnected } from "@/lib/providers";

// Ningún documento tributario se emite sin aprobación del rol de Finanzas, y siempre a través
// del proveedor de facturación electrónica, nunca directo al SII (CLAUDE.md).

export async function approveInvoiceAction(id: string): Promise<void> {
  const user = await requireUser("billing.approve");
  const inv = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId, status: "borrador" } });
  if (!inv) return;
  await prisma.invoice.update({ where: { id }, data: { status: "aprobada", approvedById: user.id, approvedAt: new Date() } });
  await audit(user, "invoice.approve", "invoice", id, { totalClp: inv.totalClp });
  revalidatePath("/facturacion");
}

export async function emitInvoiceAction(id: string): Promise<void> {
  const user = await requireUser("billing.approve");
  const inv = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId, status: "aprobada", approvedById: { not: null } } });
  if (!inv) return;
  try {
    const res = await emitTaxDocument(inv, async () => ((await prisma.invoice.aggregate({ where: { tenantId: user.tenantId }, _max: { folio: true } }))._max.folio ?? 1200) + 1);
    const now = new Date();
    await prisma.invoice.update({ where: { id }, data: { status: "emitida", folio: res.folio, provider: res.provider, issuedAt: now, dueAt: new Date(now.getTime() + 30 * 86_400_000) } });
    await audit(user, "invoice.emit", "invoice", id, { folio: res.folio, provider: res.provider });
  } catch (e) {
    if (e instanceof ProviderNotConnected) return;
    throw e;
  }
  revalidatePath("/facturacion");
}

export async function markPaidAction(id: string): Promise<void> {
  const user = await requireUser("billing.approve");
  const inv = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId, status: { in: ["emitida", "vencida"] } } });
  if (!inv) return;
  await prisma.invoice.update({ where: { id }, data: { status: "pagada", paidAt: new Date() } });
  await audit(user, "invoice.paid", "invoice", id);
  revalidatePath("/facturacion");
}
