"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { kycRisk } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { ProviderNotConnected, verifyIdentity } from "@/lib/providers";

export type PortalState = { ok: boolean; message: string } | null;

const schema = z.object({
  consent: z.literal("on"),
  biometricConsent: z.literal("on"),
  nationality: z.string().trim().min(3).max(40),
  profession: z.string().trim().min(3).max(80),
  address: z.string().trim().min(5).max(160),
  pep: z.enum(["si", "no"]),
  pepRole: z.string().trim().max(120).optional(),
  fundsOrigin: z.string().trim().max(160).optional(),
});

// Portal público de KYC (enlace con token). En producción la verificación la hace el proveedor desde
// el celular de la persona; aquí solo se guardan resultados y declaraciones, nunca imágenes.
export async function submitKycAction(token: string, _prev: PortalState, form: FormData): Promise<PortalState> {
  const k = await prisma.kycCase.findUnique({ where: { token }, include: { client: true, deal: { select: { operation: true, price: true, currency: true } } } });
  if (!k || (k.status !== "enviado" && k.status !== "pendiente")) return { ok: false, message: "Este enlace ya no está activo." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Revisa que hayas completado todo y aceptado los dos consentimientos." };
  let result;
  try {
    result = verifyIdentity(k);
  } catch (e) {
    if (e instanceof ProviderNotConnected) return { ok: false, message: "La verificación de identidad todavía no está disponible. Bull Haus te contactará." };
    throw e;
  }
  const d = parsed.data;
  const amountUf = k.deal ? (k.deal.currency === "UF" ? Number(k.deal.price) : Number(k.deal.price) / 41_316) : 0;
  const risk = kycRisk({ pep: d.pep === "si", foreign: d.nationality.toLowerCase() !== "chilena", juridica: k.client.kind === "juridica", amountUf: k.deal?.operation === "venta" ? amountUf : 0, cashOrigin: /efectivo/i.test(d.fundsOrigin ?? "") });
  await prisma.$transaction([
    prisma.client.update({ where: { id: k.clientId }, data: { nationality: d.nationality, profession: d.profession, address: d.address } }),
    prisma.kycCase.update({
      where: { id: k.id },
      data: { ...result, status: "en_revision", pep: d.pep === "si", pepRole: d.pep === "si" ? d.pepRole || "Sin detalle" : null, fundsOrigin: d.fundsOrigin || null, riskScore: risk.score, riskLevel: risk.level, submittedAt: new Date() },
    }),
  ]);
  revalidatePath(`/verificacion/${token}`);
  return { ok: true, message: "¡Listo! Recibimos tu verificación. El equipo de cumplimiento de Bull Haus la revisará." };
}
