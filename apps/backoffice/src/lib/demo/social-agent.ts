import "server-only";
import { formatDate, listingPost } from "@bullhaus/core";
import { prisma, type Prisma, type SocialPlatform } from "@bullhaus/db";
import type { CurrentUser } from "../auth";
import { rng } from "./leads";
import { DAY } from "./legal";

// Agente de redes sociales en la demo: activo, con la mayoría de las publicaciones de los últimos dos meses
// preparadas por él (y aprobadas por el equipo), cuatro borradores esperando revisión y su bitácora de
// respuestas, derivaciones e informes. La bitácora describe acciones; no guarda textos de contactos.

const COMMENT_REPLIES = [
  (c: string) => `Respondió una consulta de precio en la publicación de ${c} con el valor de la ficha`,
  (c: string) => `Respondió si ${c} sigue disponible e invitó a coordinar visita por WhatsApp`,
  (c: string) => `Respondió una consulta de superficie de ${c} con los m² de la ficha`,
  (c: string) => `Agradeció un comentario en la publicación de ${c}`,
  (c: string) => `Respondió en qué sector está ${c}; la dirección exacta se entrega al confirmar la visita`,
];
const DM_REPLIES = [
  (c: string) => `Agendó una visita a ${c} por mensaje directo`,
  (c: string) => `Envió el brochure de ${c} por mensaje directo`,
  () => "Agendó una valorización con un propietario por mensaje directo",
  (c: string) => `Respondió gastos comunes y estacionamientos de ${c} con los datos de la ficha`,
];
const HANDOFFS = [
  "Derivó una consulta de negociación de precio al corredor a cargo",
  "Derivó una consulta sobre crédito hipotecario al corredor a cargo",
  "Derivó a un propietario que quiere vender en la V Región costa",
  "Derivó un reclamo para que lo atienda una persona del equipo",
];

export async function loadDemoSocialAgent(user: CurrentUser): Promise<{ drafts: number; events: number }> {
  const r = rng(20261118);
  const tenantId = user.tenantId;
  await prisma.socialAgentSetting.upsert({ where: { tenantId }, create: { tenantId, enabled: true }, update: { enabled: true } });

  const accounts = await prisma.socialAccount.findMany({ where: { tenantId, isDemo: true } });
  const acc = (p: SocialPlatform) => accounts.find((a) => a.platform === p);
  const ig = acc("instagram");
  const fb = acc("facebook");
  if (!ig || !fb) return { drafts: 0, events: 0 };

  // Publicaciones de los últimos 60 días: la mayoría las preparó el agente.
  const published = await prisma.socialPost.findMany({
    where: { tenantId, isDemo: true, accountId: { in: [ig.id, fb.id] }, publishedAt: { gte: new Date(Date.now() - 60 * DAY) } },
    select: { id: true, publishedAt: true, account: { select: { platform: true } }, property: { select: { code: true } } },
  });
  const byAgent = published.filter(() => r() < 0.75);
  await prisma.socialPost.updateMany({ where: { id: { in: byAgent.map((p) => p.id) } }, data: { byAgent: true } });

  const events: Prisma.SocialAgentEventCreateManyInput[] = byAgent.map((p) => ({
    tenantId, kind: "borrador", platform: p.account.platform, summary: `Preparó la publicación de ${p.property?.code ?? "captación"}; la aprobó el equipo`, postId: p.id, at: new Date(p.publishedAt!.getTime() - (1 + r() * 2) * DAY), isDemo: true,
  }));

  // Borradores pendientes de revisión.
  const recent = new Set(published.map((p) => p.property?.code));
  const props = (await prisma.property.findMany({ where: { tenantId, status: "disponible", media: { some: {} } }, orderBy: { price: "desc" } })).filter((p) => !recent.has(p.code)).slice(0, 4);
  const codes = (await prisma.property.findMany({ where: { tenantId, status: "disponible" }, select: { code: true }, take: 40 })).map((p) => p.code);
  let drafts = 0;
  for (const [i, p] of props.entries()) {
    const d = listingPost({ ...p, price: Number(p.price), m2Useful: p.m2Useful ? Number(p.m2Useful) : null, m2Land: p.m2Land ? Number(p.m2Land) : null }, i % 2 ? "post" : "carrusel");
    const at = new Date(Date.now() - (i + 1) * 3_600_000 * 5);
    const scheduledAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1 + i * 2, 22));
    for (const a of [ig, fb]) {
      const post = await prisma.socialPost.create({
        data: {
          tenantId, accountId: a.id, propertyId: p.id, format: a === ig ? d.format : "post", status: "en_revision", byAgent: true, title: d.hook,
          caption: a === ig ? `${d.caption}\n\n${d.hashtags.join(" ")}` : d.caption, scheduledAt, publishedAt: null, isDemo: true,
        },
      });
      events.push({ tenantId, kind: "borrador", platform: a.platform, summary: `Preparó una publicación de ${p.code} para revisión`, postId: post.id, at, isDemo: true });
      drafts++;
    }
  }

  // Respuestas, derivaciones e informes de los últimos 60 días.
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]!;
  for (let o = 60; o >= 0; o--) {
    const day = Date.now() - o * DAY;
    const at = () => new Date(day - r() * 14 * 3_600_000);
    const platform = (): SocialPlatform => (r() < 0.8 ? "instagram" : "facebook");
    for (let k = Math.floor(1 + r() * 4); k > 0; k--) events.push({ tenantId, kind: "respuesta_comentario", platform: platform(), summary: pick(COMMENT_REPLIES)(pick(codes)), at: at(), isDemo: true });
    for (let k = Math.floor(r() * 3); k > 0; k--) events.push({ tenantId, kind: "respuesta_mensaje", platform: platform(), summary: pick(DM_REPLIES)(pick(codes)), at: at(), isDemo: true });
    if (r() < 0.45) events.push({ tenantId, kind: "derivacion", platform: platform(), summary: pick(HANDOFFS), at: at(), isDemo: true });
    if (new Date(day).getUTCDay() === 1) {
      const week = published.filter((p) => p.publishedAt!.getTime() > day - 7 * DAY && p.publishedAt!.getTime() <= day).length;
      events.push({ tenantId, kind: "informe", platform: "instagram", summary: `Informe de la semana al ${formatDate(new Date(day))}: ${week} publicaciones, alcance y comentarios por publicación enviados al equipo`, at: new Date(day - 10 * 3_600_000), isDemo: true });
    }
  }
  await prisma.socialAgentEvent.createMany({ data: events });
  return { drafts, events: events.length };
}
