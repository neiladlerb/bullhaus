import "server-only";
import { listingPost } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "./audit";
import type { CurrentUser } from "./auth";

// Agente de redes sociales. Prepara publicaciones de Instagram y Facebook con el texto armado desde la
// ficha aprobada (nunca desde fotos ni audio) y las deja "en revisión": publicar requiere que una persona
// con campaigns.approve la apruebe. Las respuestas a comentarios y mensajes las da el asistente virtual
// de Bull Haus con sus mismas reglas; aquí solo queda la bitácora, sin el texto del contacto.

export const SOCIAL_AGENT_EVENT_LABELS = {
  borrador: "Borrador preparado",
  respuesta_comentario: "Respondió un comentario",
  respuesta_mensaje: "Respondió un mensaje directo",
  derivacion: "Derivó a un corredor",
  informe: "Informe semanal",
} as const;

export async function socialAgentSettings(tenantId: string) {
  return (await prisma.socialAgentSetting.findUnique({ where: { tenantId } })) ?? (await prisma.socialAgentSetting.create({ data: { tenantId } }));
}

const nextSlot = (from: Date, i: number, perWeek: number) => {
  const gap = Math.max(1, Math.round(7 / Math.max(1, perWeek)));
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1 + i * gap, 22, 0));
  return d; // 19:00 en Santiago (UTC-3), la hora con más alcance en la cuenta.
};

/**
 * Prepara hasta `postsPerWeek` borradores con propiedades disponibles, con fotos, publicadas en la web y
 * sin publicación en los últimos 30 días. Devuelve cuántos creó.
 */
export async function draftAgentPosts(user: CurrentUser): Promise<number> {
  const s = await socialAgentSettings(user.tenantId);
  const platforms = s.platforms.filter((p): p is "instagram" | "facebook" => p === "instagram" || p === "facebook");
  if (!s.draftNewListings || !platforms.length) return 0;
  const accounts = await prisma.socialAccount.findMany({ where: { tenantId: user.tenantId, platform: { in: platforms } } });
  if (!accounts.length) return 0;
  const recent = await prisma.socialPost.findMany({
    where: { tenantId: user.tenantId, propertyId: { not: null }, OR: [{ publishedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, { status: { in: ["borrador", "en_revision", "aprobado"] } }] },
    select: { propertyId: true },
  });
  const skip = new Set(recent.map((r) => r.propertyId!));
  const props = (
    await prisma.property.findMany({
      where: { tenantId: user.tenantId, status: "disponible", publishWeb: true, media: { some: {} } },
      orderBy: [{ listedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    })
  ).filter((p) => !skip.has(p.id)).slice(0, s.postsPerWeek);

  let created = 0;
  for (const [i, p] of props.entries()) {
    const draft = listingPost({ ...p, price: Number(p.price), m2Useful: p.m2Useful ? Number(p.m2Useful) : null, m2Land: p.m2Land ? Number(p.m2Land) : null }, i % 2 ? "post" : "carrusel");
    for (const a of accounts) {
      const post = await prisma.socialPost.create({
        data: {
          tenantId: user.tenantId, accountId: a.id, propertyId: p.id, format: a.platform === "instagram" ? draft.format : "post", status: "en_revision", byAgent: true,
          title: draft.hook, caption: a.platform === "instagram" ? `${draft.caption}\n\n${draft.hashtags.join(" ")}` : draft.caption,
          scheduledAt: nextSlot(new Date(), i, s.postsPerWeek), publishedAt: null, isDemo: a.isDemo,
        },
      });
      await prisma.socialAgentEvent.create({ data: { tenantId: user.tenantId, kind: "borrador", platform: a.platform, summary: `Preparó una publicación de ${p.code} para revisión`, postId: post.id, isDemo: a.isDemo } });
      created++;
    }
  }
  if (created) await audit(user, "social_agent.draft", "social_post", undefined, { created });
  return created;
}
