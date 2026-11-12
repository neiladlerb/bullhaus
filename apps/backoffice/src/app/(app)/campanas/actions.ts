"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

const id = (form: FormData) => z.string().min(1).parse(form.get("id"));

async function find(tenantId: string, campaignId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, tenantId } });
}

/** Aprobar es la decisión humana que exige CLAUDE.md: textos y presupuesto. */
export async function approveCampaignAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const c = await find(user.tenantId, id(form));
  if (!c || !["borrador", "en_revision"].includes(c.status)) return;
  const now = new Date();
  await prisma.$transaction([
    prisma.campaign.update({ where: { id: c.id }, data: { status: "aprobada", approvedById: user.id, approvedAt: now } }),
    prisma.campaignPost.updateMany({ where: { campaignId: c.id, status: "borrador" }, data: { status: "aprobado", approvedById: user.id, approvedAt: now } }),
  ]);
  await audit(user, "campaign.approve", "campaign", c.id, { budgetClp: c.budgetClp });
  revalidatePath(`/campanas/${c.id}`);
  revalidatePath("/campanas");
}

export async function returnToDraftAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const c = await find(user.tenantId, id(form));
  if (!c || c.status !== "en_revision") return;
  await prisma.campaign.update({ where: { id: c.id }, data: { status: "borrador" } });
  await audit(user, "campaign.return", "campaign", c.id);
  revalidatePath(`/campanas/${c.id}`);
}

export async function submitCampaignAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.write");
  const c = await find(user.tenantId, id(form));
  if (!c || c.status !== "borrador") return;
  await prisma.campaign.update({ where: { id: c.id }, data: { status: "en_revision" } });
  await audit(user, "campaign.submit", "campaign", c.id);
  revalidatePath(`/campanas/${c.id}`);
}

const postSchema = z.object({
  postId: z.string().min(1),
  hook: z.string().trim().min(3).max(140),
  caption: z.string().trim().min(10).max(2200),
});

/** Editar un texto lo devuelve a borrador: la aprobación vale para el texto que se aprobó. */
export async function updatePostAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.write");
  const data = postSchema.parse(Object.fromEntries(form));
  const post = await prisma.campaignPost.findFirst({ where: { id: data.postId, campaign: { tenantId: user.tenantId } }, include: { campaign: true } });
  if (!post || post.status === "publicado" || ["activa", "finalizada"].includes(post.campaign.status)) return;
  await prisma.$transaction([
    prisma.campaignPost.update({ where: { id: post.id }, data: { hook: data.hook, caption: data.caption, status: "borrador", approvedById: null, approvedAt: null } }),
    prisma.campaign.update({
      where: { id: post.campaignId },
      data: post.campaign.status === "aprobada" ? { status: "en_revision", approvedById: null, approvedAt: null } : {},
    }),
  ]);
  await audit(user, "campaign.post_edit", "campaign", post.campaignId, { postId: post.id });
  revalidatePath(`/campanas/${post.campaignId}`);
}
