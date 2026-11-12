"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

// Solo el rol de Cumplimiento aprueba o rechaza un KYC (CLAUDE.md).
export async function reviewKycAction(id: string, decision: "aprobado" | "rechazado", form: FormData): Promise<void> {
  const user = await requireUser("kyc.review");
  const note = z.string().trim().max(500).parse(form.get("note") ?? "");
  const k = await prisma.kycCase.findFirst({ where: { id, tenantId: user.tenantId, status: "en_revision" } });
  if (!k) return;
  if (decision === "aprobado" && k.riskLevel === "alto" && note.length < 10) return; // riesgo alto: la nota de debida diligencia reforzada es obligatoria
  await prisma.kycCase.update({ where: { id }, data: { status: decision, reviewedAt: new Date(), reviewerId: user.id, reviewNote: note || null } });
  await prisma.kycAccessLog.create({ data: { caseId: id, userId: user.id, action: decision === "aprobado" ? "aprobar" : "rechazar" } });
  await audit(user, `kyc.${decision}`, "kyc_case", id, { risk: k.riskLevel });
  revalidatePath(`/kyc/${id}`);
  revalidatePath("/kyc");
}
