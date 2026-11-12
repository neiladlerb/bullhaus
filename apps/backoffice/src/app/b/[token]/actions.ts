"use server";
import { z } from "zod";
import { BROCHURE_KIND_LABELS, BROCHURE_LEAD_KIND, sourceForChannel } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";

// Formulario del brochure: crea un lead con la fuente del canal por el que llegó el enlace y un
// compromiso para que el corredor lo contacte. No se registra el mensaje en los logs.

export type BrochureFormState = { ok: boolean; message: string } | null;

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30).regex(/^[+\d\s()-]+$/),
  email: z.string().trim().email().max(160).optional().or(z.literal("").transform(() => undefined)),
  comuna: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal("on"),
  website: z.literal("").optional(), // trampa para bots
});

export async function submitBrochureLeadAction(token: string, shareId: string | null, _prev: BrochureFormState, form: FormData): Promise<BrochureFormState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Revisa tu nombre y tu celular, y acepta el tratamiento de tus datos." };
  const b = await prisma.brochure.findUnique({ where: { token }, include: { property: { select: { id: true, brokerId: true, comuna: true, price: true, currency: true, status: true, code: true } } } });
  if (!b || b.status !== "aprobado" || (b.property && b.property.status !== "disponible")) return { ok: false, message: "Este brochure ya no está disponible." };
  const share = shareId ? await prisma.brochureShare.findFirst({ where: { id: shareId, brochureId: b.id } }) : null;
  const d = parsed.data;
  const kind = BROCHURE_LEAD_KIND[b.kind];
  const brokerId = b.property?.brokerId ?? b.createdById ?? null;
  const now = new Date();

  await prisma.lead.create({
    data: {
      tenantId: b.tenantId,
      kind,
      source: sourceForChannel(share?.channel),
      name: d.name,
      phone: d.phone,
      email: d.email ?? null,
      comuna: d.comuna || b.property?.comuna || null,
      interest: d.message?.slice(0, 300) || (b.property ? `Brochure ${b.property.code}` : BROCHURE_KIND_LABELS[b.kind]),
      notes: d.message || null,
      propertyId: b.property?.id ?? null,
      budget: b.property?.price ?? null,
      budgetCurrency: b.property?.currency ?? null,
      brokerId,
      brochureId: b.id,
      isDemo: b.isDemo,
      tasks: {
        create: {
          tenantId: b.tenantId,
          ownerId: brokerId,
          kind: "llamar",
          title: kind === "propietario" ? "Llamar para agendar la valorización (pidió contacto desde el brochure)" : "Llamar: pidió información desde el brochure",
          dueAt: new Date(now.getTime() + 2 * 3_600_000),
          templateKey: kind === "propietario" ? "agendar_valorizacion" : "primer_contacto",
          isDemo: b.isDemo,
        },
      },
    },
  });
  return { ok: true, message: kind === "propietario" ? "¡Gracias! Un corredor de Bull Haus te llamará para coordinar la visita de valorización." : "¡Gracias! Un corredor de Bull Haus te contactará para coordinar una visita." };
}
