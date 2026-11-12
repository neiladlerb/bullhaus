import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { brochureShareText, can, mailtoLink, socialShareLink, SHARE_CHANNEL_LABELS, waLink } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { brochureUrl, canShare } from "@/lib/brochures";
import { leadScope } from "@/lib/leads";
import { composeByKey, demoSendUrl } from "@/lib/outreach";

// Registra el envío (canal, contacto, quién) y abre la aplicación correspondiente con el texto listo.
// El corredor es quien envía: wa.me y mailto abren su WhatsApp o su correo. Instagram no permite
// compartir enlaces desde la web, así que se muestra el texto para copiar en historia o mensaje directo.

const query = z.object({ c: z.enum(["whatsapp", "instagram", "facebook", "linkedin", "email", "enlace"]), lead: z.string().optional() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const back = `/brochures/${id}`;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (!user || (!can(user.role, "leads.write") && !can(user.role, "campaigns.write"))) return to("/login");
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return to(back);

  const b = await prisma.brochure.findFirst({ where: { id, tenantId: user.tenantId }, include: { property: { select: { code: true, status: true } } } });
  if (!b || !canShare(b.status, b.property?.status, b.kind)) return to(`${back}?error=no-aprobado`);
  const lead = q.data.lead
    ? await prisma.lead.findFirst({ where: { id: q.data.lead, ...leadScope(user) }, select: { id: true, name: true, phone: true, email: true, kind: true, isDemo: true, property: { select: { code: true } } } })
    : null;
  if (q.data.c === "email" && !lead?.email) return to(`${back}?error=sin-email`);

  const channel = q.data.c;
  const share = await prisma.brochureShare.create({ data: { tenantId: user.tenantId, brochureId: b.id, channel, leadId: lead?.id ?? null, sentById: user.id, isDemo: b.isDemo } });
  const url = await brochureUrl(b.token, share.id);
  await audit(user, "brochure.share", "brochure", b.id, { channel, toLead: Boolean(lead) });

  if (lead) {
    // Compromiso automático: revisar en dos días si lo abrió y retomar.
    await prisma.leadTask.create({
      data: { tenantId: user.tenantId, leadId: lead.id, ownerId: user.id, kind: "seguimiento", title: `Seguimiento del brochure enviado por ${SHARE_CHANNEL_LABELS[channel]}`, dueAt: new Date(Date.now() + 2 * 86_400_000), templateKey: "seguimiento_visita", isDemo: lead.isDemo },
    });
  }

  const demo = b.isDemo || Boolean(lead?.isDemo);
  const msg = lead ? composeByKey("envio_brochure", lead, user.name, { enlace: url }) : { subject: b.title, body: brochureShareText(b.kind, b.title, url) };

  if (channel === "instagram" || channel === "enlace") return to(`${back}?copiar=${share.id}`);
  if (demo) return to(demoSendUrl({ channel, to: lead ? `${lead.name}${channel === "email" ? ` <${lead.email}>` : lead.phone ? ` (${lead.phone})` : ""}` : channel === "whatsapp" ? "Elegir contacto en WhatsApp" : `Página de Bull Haus en ${SHARE_CHANNEL_LABELS[channel]}`, subject: channel === "email" ? msg.subject : undefined, text: msg.body, share: share.id, back }));
  if (channel === "whatsapp") return NextResponse.redirect(waLink(msg.body, lead?.phone));
  if (channel === "email") return NextResponse.redirect(mailtoLink(lead!.email!, msg.subject, msg.body));
  return NextResponse.redirect(socialShareLink(channel, url));
}
