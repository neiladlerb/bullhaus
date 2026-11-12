"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { dealBlocker, nextDealStage, type ContractKind } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { generateDealContract } from "@/lib/contracts";

export type ActionState = { ok: boolean; message: string } | null;

async function loadDeal(tenantId: string, id: string) {
  return prisma.deal.findFirst({
    where: { id, tenantId },
    include: { parties: { include: { client: { include: { kycCases: { orderBy: { createdAt: "desc" }, take: 1 } } } } } },
  });
}

export async function advanceDealAction(id: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser("deals.write");
  const d = await loadDeal(user.tenantId, id);
  if (!d) return { ok: false, message: "Operación no encontrada." };
  const to = nextDealStage(d.stage, d.operation);
  if (!to) return { ok: false, message: "La operación ya está en su última etapa." };
  // Ninguna operación pasa a Promesa o Contrato sin KYC aprobado de todas las partes (CLAUDE.md).
  const blocker = dealBlocker(to, d.parties.map((p) => ({ name: p.client.name, kycStatus: p.client.kycCases[0]?.status ?? null })));
  if (blocker) return { ok: false, message: blocker };
  await prisma.deal.update({ where: { id }, data: { stage: to, stageChangedAt: new Date(), closedAt: to === "cerrada" ? new Date() : null } });
  await audit(user, "deal.stage", "deal", id, { from: d.stage, to });
  revalidatePath(`/operaciones/${id}`);
  return { ok: true, message: "Etapa actualizada." };
}

export async function sendKycLinkAction(dealId: string, clientId: string): Promise<void> {
  const user = await requireUser("deals.write");
  const d = await loadDeal(user.tenantId, dealId);
  const party = d?.parties.find((p) => p.clientId === clientId);
  if (!d || !party) return;
  const current = party.client.kycCases[0];
  if (current && current.status !== "rechazado" && current.status !== "pendiente") return;
  const data = { status: "enviado" as const, sentAt: new Date() };
  if (current?.status === "pendiente") await prisma.kycCase.update({ where: { id: current.id }, data });
  else await prisma.kycCase.create({ data: { ...data, tenantId: user.tenantId, clientId, dealId, token: randomBytes(18).toString("base64url"), provider: d.isDemo ? "simulado" : "pendiente", isDemo: d.isDemo } });
  // El agente o el corredor solo envían el enlace; nunca se piden documentos por chat.
  await audit(user, "kyc.link_sent", "client", clientId, { dealId });
  revalidatePath(`/operaciones/${dealId}`);
}

export async function generateContractAction(dealId: string, kind: Exclude<ContractKind, "orden_corretaje">, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser("contracts.write");
  const res = await generateDealContract(user.tenantId, dealId, kind);
  if (!res.ok) return { ok: false, message: res.problems.join(" ") };
  await audit(user, "contract.generate", "contract", res.id, { kind, dealId });
  revalidatePath(`/operaciones/${dealId}`);
  return { ok: true, message: "Documento generado." };
}
