"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { ProviderNotConnected, publishSocialPost } from "@/lib/providers";
import { draftAgentPosts, socialAgentSettings } from "@/lib/social-agent";

// Agente de redes: ajustes, borradores y la cola de aprobación. Publicar exige aprobación de una persona
// de Bull Haus (campaigns.approve) y pasa por el proveedor de Meta.

const PATH = "/agentes/redes";
const id = (form: FormData) => z.string().min(1).parse(form.get("id"));
const find = (tenantId: string, postId: string) =>
  prisma.socialPost.findFirst({ where: { id: postId, tenantId, byAgent: true }, include: { account: { select: { platform: true } }, property: { select: { code: true } } } });

const settingsSchema = z.object({
  enabled: z.boolean(),
  platforms: z.array(z.enum(["instagram", "facebook", "linkedin"])),
  postsPerWeek: z.coerce.number().int().min(1).max(14),
  draftNewListings: z.boolean(),
  replyComments: z.boolean(),
  tone: z.string().trim().min(10).max(400),
});

export async function saveSocialAgentAction(form: FormData): Promise<void> {
  const user = await requireUser("agents.manage");
  const data = settingsSchema.parse({
    enabled: form.get("enabled") === "on",
    platforms: form.getAll("platforms"),
    postsPerWeek: form.get("postsPerWeek"),
    draftNewListings: form.get("draftNewListings") === "on",
    replyComments: form.get("replyComments") === "on",
    tone: form.get("tone"),
  });
  await socialAgentSettings(user.tenantId);
  await prisma.socialAgentSetting.update({ where: { tenantId: user.tenantId }, data });
  await audit(user, "social_agent.settings", "social_agent_setting", user.tenantId, { enabled: data.enabled, platforms: data.platforms, postsPerWeek: data.postsPerWeek });
  revalidatePath(PATH);
  redirect(`${PATH}?ok=ajustes`);
}

export async function draftNowAction(): Promise<void> {
  const user = await requireUser("campaigns.write");
  const n = await draftAgentPosts(user);
  revalidatePath(PATH);
  redirect(`${PATH}?borradores=${n}`);
}

async function event(tenantId: string, isDemo: boolean, platform: "instagram" | "facebook" | "linkedin", summary: string, postId: string) {
  await prisma.socialAgentEvent.create({ data: { tenantId, kind: "borrador", platform, summary, postId, isDemo } });
}

export async function approveAgentPostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const post = await find(user.tenantId, id(form));
  if (!post || post.status !== "en_revision") return;
  await prisma.socialPost.update({ where: { id: post.id }, data: { status: "aprobado", approvedById: user.id, approvedAt: new Date() } });
  await event(user.tenantId, post.isDemo, post.account.platform, `${user.name} aprobó la publicación de ${post.property?.code ?? "captación"}`, post.id);
  await audit(user, "social_post.approve", "social_post", post.id);
  revalidatePath(PATH);
}

export async function rejectAgentPostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const post = await find(user.tenantId, id(form));
  if (!post || !["en_revision", "aprobado"].includes(post.status)) return;
  await prisma.socialPost.update({ where: { id: post.id }, data: { status: "rechazado", approvedById: null, approvedAt: null } });
  await event(user.tenantId, post.isDemo, post.account.platform, `${user.name} descartó la publicación de ${post.property?.code ?? "captación"}`, post.id);
  await audit(user, "social_post.reject", "social_post", post.id);
  revalidatePath(PATH);
}

export async function editAgentPostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.write");
  const post = await find(user.tenantId, id(form));
  if (!post || !["en_revision", "aprobado"].includes(post.status)) return;
  const caption = z.string().trim().min(20).max(2200).parse(form.get("caption"));
  // Un cambio después de aprobado vuelve a revisión.
  await prisma.socialPost.update({ where: { id: post.id }, data: { caption, status: "en_revision", approvedById: null, approvedAt: null } });
  await audit(user, "social_post.edit", "social_post", post.id);
  revalidatePath(PATH);
}

export async function publishAgentPostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const post = await find(user.tenantId, id(form));
  if (!post || post.status !== "aprobado" || !post.approvedById) return;
  try {
    const res = publishSocialPost(post, post.account.platform);
    await prisma.socialPost.update({ where: { id: post.id }, data: { status: "publicado", publishedAt: new Date() } });
    await audit(user, "social_post.publish", "social_post", post.id, { provider: res.provider });
  } catch (e) {
    if (e instanceof ProviderNotConnected) redirect(`${PATH}?error=no-conectado`);
    throw e;
  }
  revalidatePath(PATH);
}
