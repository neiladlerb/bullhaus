"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { ProviderNotConnected, sendChannelMessage } from "@/lib/providers";

async function ownConversation(id: string) {
  const user = await requireUser("agents.read");
  const c = await prisma.conversation.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!c) throw new Error("Conversación no encontrada");
  return { user, c };
}

export async function takeConversationAction(id: string) {
  const { user, c } = await ownConversation(id);
  await prisma.conversation.update({ where: { id }, data: { status: "humano" } });
  await prisma.message.create({ data: { conversationId: id, role: "sistema", body: `${user.name} tomó la conversación. El agente deja de responder.`, createdAt: new Date() } });
  await audit(user, "conversation.take", "conversation", c.id);
  revalidatePath("/agentes/bandeja");
}

export async function returnConversationAction(id: string) {
  const { user, c } = await ownConversation(id);
  await prisma.conversation.update({ where: { id }, data: { status: "agente" } });
  await prisma.message.create({ data: { conversationId: id, role: "sistema", body: `${user.name} devolvió la conversación al agente.`, createdAt: new Date() } });
  await audit(user, "conversation.return", "conversation", c.id);
  revalidatePath("/agentes/bandeja");
}

export async function replyAction(id: string, form: FormData): Promise<void> {
  const { user, c } = await ownConversation(id);
  const body = z.string().trim().min(1).max(2000).safeParse(form.get("body"));
  if (!body.success || c.status !== "humano") return;
  try {
    sendChannelMessage(c);
  } catch (e) {
    if (e instanceof ProviderNotConnected) return;
    throw e;
  }
  await prisma.message.create({ data: { conversationId: id, role: "corredor", body: body.data, createdAt: new Date() } });
  await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
  // El cuerpo del mensaje no va al registro de auditoría (CLAUDE.md).
  await audit(user, "conversation.reply", "conversation", c.id);
  revalidatePath("/agentes/bandeja");
}

const settingSchema = z.object({
  enabled: z.literal("on").optional(),
  assistantName: z.string().trim().min(3).max(80),
  hoursFrom: z.string().regex(/^\d{2}:\d{2}$/),
  hoursTo: z.string().regex(/^\d{2}:\d{2}$/),
  maxRejections: z.coerce.number().int().min(1).max(5),
  stopWords: z.string().trim().min(2),
  handoffRules: z.string().trim().max(1000).optional(),
  visitMinutes: z.coerce.number().int().min(15).max(180),
  minNoticeHours: z.coerce.number().int().min(0).max(72),
});

export async function saveSettingAction(channel: "whatsapp" | "instagram" | "facebook" | "voz", form: FormData): Promise<void> {
  const user = await requireUser("agents.manage");
  const parsed = settingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const { enabled, stopWords, ...rest } = parsed.data;
  const data = { ...rest, enabled: enabled === "on", stopWords: stopWords.split(",").map((w) => w.trim().toUpperCase()).filter(Boolean) };
  await prisma.agentSetting.upsert({ where: { tenantId_channel: { tenantId: user.tenantId, channel } }, update: data, create: { tenantId: user.tenantId, channel, ...data } });
  await audit(user, "agent.settings", "agent_setting", channel, { enabled: data.enabled, maxRejections: data.maxRejections });
  revalidatePath("/agentes", "layout");
}

const kbSchema = z.object({ title: z.string().trim().min(3).max(120), body: z.string().trim().min(10).max(3000) });

export async function saveKnowledgeAction(id: string | null, form: FormData): Promise<void> {
  const user = await requireUser("agents.manage");
  const parsed = kbSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  if (id) {
    await prisma.knowledgeItem.updateMany({ where: { id, tenantId: user.tenantId }, data: parsed.data });
  } else {
    await prisma.knowledgeItem.create({ data: { ...parsed.data, tenantId: user.tenantId } });
  }
  await audit(user, "knowledge.save", "knowledge_item", id ?? undefined, { title: parsed.data.title });
  revalidatePath("/agentes/ajustes");
}

export async function deleteKnowledgeAction(id: string): Promise<void> {
  const user = await requireUser("agents.manage");
  await prisma.knowledgeItem.deleteMany({ where: { id, tenantId: user.tenantId } });
  await audit(user, "knowledge.delete", "knowledge_item", id);
  revalidatePath("/agentes/ajustes");
}
