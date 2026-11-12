"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LINKEDIN_SERIES, LINKEDIN_TIPS, linkedinPostText } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { ProviderNotConnected, publishSocialPost } from "@/lib/providers";

// Flujo editorial de LinkedIn: borrador → en revisión → aprobado → publicado.
// Nada se publica sin la aprobación de una persona de Bull Haus (CLAUDE.md), y publicar pasa siempre
// por el proveedor: en un registro real sin LinkedIn conectado, la publicación se bloquea.

const PATH = "/redes/linkedin";
const id = (form: FormData) => z.string().min(1).parse(form.get("id"));

async function find(tenantId: string, postId: string) {
  return prisma.socialPost.findFirst({ where: { id: postId, tenantId, account: { platform: "linkedin" } }, include: { account: { select: { platform: true } } } });
}

const nextTuesday = (after: Date) => {
  const d = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate()));
  const add = (2 - d.getUTCDay() + 7) % 7 || 7;
  return new Date(d.getTime() + add * 86_400_000 + 12 * 3_600_000);
};

/** Crea un borrador con el siguiente consejo de la biblioteca que aún no se ha usado. */
export async function createTipDraftAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.write");
  const account = await prisma.socialAccount.findFirst({ where: { tenantId: user.tenantId, platform: "linkedin" } });
  if (!account) redirect(`${PATH}?error=sin-cuenta`);
  const topic = z.enum(["vender", "comprar", "arrendar", ""]).catch("").parse(form.get("topic") ?? "");
  const used = await prisma.socialPost.findMany({ where: { accountId: account.id, series: LINKEDIN_SERIES }, select: { title: true, scheduledAt: true } });
  const usedTitles = new Set(used.map((u) => u.title));
  const tip = LINKEDIN_TIPS.find((t) => !usedTitles.has(t.title) && (!topic || t.topic === topic));
  if (!tip) redirect(`${PATH}?error=sin-consejos`);
  const last = used.reduce<Date>((a, u) => (u.scheduledAt && u.scheduledAt > a ? u.scheduledAt : a), new Date());
  const post = await prisma.socialPost.create({
    data: { tenantId: user.tenantId, accountId: account.id, format: "post", status: "borrador", series: LINKEDIN_SERIES, topic: tip.topic, title: tip.title, caption: linkedinPostText(tip), scheduledAt: nextTuesday(last), publishedAt: null, isDemo: account.isDemo },
  });
  await audit(user, "social_post.create", "social_post", post.id, { platform: "linkedin", tip: tip.key });
  revalidatePath(PATH);
}

/** Editar el texto: solo antes de aprobarse. Un cambio después de aprobado lo devuelve a revisión. */
export async function updateCaptionAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.write");
  const post = await find(user.tenantId, id(form));
  if (!post || !["borrador", "en_revision", "aprobado", "rechazado"].includes(post.status)) return;
  const caption = z.string().trim().min(20).max(3000).parse(form.get("caption"));
  const scheduled = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined).parse(form.get("date") || undefined);
  await prisma.socialPost.update({
    where: { id: post.id },
    data: {
      caption,
      ...(scheduled ? { scheduledAt: new Date(`${scheduled}T12:00:00Z`) } : {}),
      ...(post.status === "aprobado" || post.status === "rechazado" ? { status: "en_revision", approvedById: null, approvedAt: null } : {}),
    },
  });
  await audit(user, "social_post.edit", "social_post", post.id);
  revalidatePath(PATH);
}

export async function submitPostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.write");
  const post = await find(user.tenantId, id(form));
  if (!post || post.status !== "borrador") return;
  await prisma.socialPost.update({ where: { id: post.id }, data: { status: "en_revision" } });
  await audit(user, "social_post.submit", "social_post", post.id);
  revalidatePath(PATH);
}

export async function approvePostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const post = await find(user.tenantId, id(form));
  if (!post || post.status !== "en_revision") return;
  await prisma.socialPost.update({ where: { id: post.id }, data: { status: "aprobado", approvedById: user.id, approvedAt: new Date() } });
  await audit(user, "social_post.approve", "social_post", post.id);
  revalidatePath(PATH);
}

export async function rejectPostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const post = await find(user.tenantId, id(form));
  if (!post || !["en_revision", "aprobado"].includes(post.status)) return;
  await prisma.socialPost.update({ where: { id: post.id }, data: { status: "rechazado", approvedById: null, approvedAt: null } });
  await audit(user, "social_post.reject", "social_post", post.id);
  revalidatePath(PATH);
}

/** Publica un post aprobado. En la demo se marca publicado sin salir a LinkedIn. */
export async function publishPostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const post = await find(user.tenantId, id(form));
  if (!post || post.status !== "aprobado" || !post.approvedById) return;
  try {
    const res = publishSocialPost(post, "linkedin");
    await prisma.socialPost.update({ where: { id: post.id }, data: { status: "publicado", publishedAt: new Date() } });
    await audit(user, "social_post.publish", "social_post", post.id, { provider: res.provider });
  } catch (e) {
    if (e instanceof ProviderNotConnected) redirect(`${PATH}?error=no-conectado`);
    throw e;
  }
  revalidatePath(PATH);
}
