"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { ProviderNotConnected, sendToSignature } from "@/lib/providers";

export async function sendToSignatureAction(id: string): Promise<void> {
  const user = await requireUser("contracts.write");
  const c = await prisma.contract.findFirst({ where: { id, tenantId: user.tenantId, status: "borrador" } });
  if (!c) return;
  try {
    sendToSignature(c);
  } catch (e) {
    if (e instanceof ProviderNotConnected) return;
    throw e;
  }
  await prisma.contract.update({ where: { id }, data: { status: "enviado", sentAt: new Date() } });
  await audit(user, "contract.send", "contract", id);
  revalidatePath(`/contratos/${id}`);
}

export async function markSignedAction(id: string): Promise<void> {
  const user = await requireUser("contracts.write");
  // Solo la demo marca firmas a mano; en producción la firma la informa el proveedor.
  const c = await prisma.contract.findFirst({ where: { id, tenantId: user.tenantId, status: "enviado", isDemo: true } });
  if (!c) return;
  await prisma.contract.update({ where: { id }, data: { status: "firmado", signedAt: new Date() } });
  await audit(user, "contract.signed", "contract", id, { simulated: true });
  revalidatePath(`/contratos/${id}`);
}
