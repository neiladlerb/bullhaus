"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { santiagoToDate } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { leadScope } from "@/lib/leads";

// Compromisos de contacto: qué se hará, cuándo y por qué canal. Son recordatorios para el corredor;
// el sistema nunca contacta solo al lead.

const refresh = (leadId: string) => {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
  revalidatePath("/");
};

async function taskInScope(user: CurrentUser, id: string) {
  return prisma.leadTask.findFirst({ where: { id, tenantId: user.tenantId, lead: leadScope(user) } });
}

const taskSchema = z.object({
  leadId: z.string().min(1),
  kind: z.enum(["llamar", "whatsapp", "email", "visita", "seguimiento"]),
  title: z.string().trim().min(3).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  templateKey: z.string().max(40).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function createTaskAction(form: FormData): Promise<void> {
  const user = await requireUser("leads.write");
  const d = taskSchema.parse(Object.fromEntries(form));
  const lead = await prisma.lead.findFirst({ where: { id: d.leadId, ...leadScope(user) }, select: { id: true, isDemo: true, brokerId: true } });
  if (!lead) return;
  const t = await prisma.leadTask.create({
    data: { tenantId: user.tenantId, leadId: lead.id, ownerId: lead.brokerId ?? user.id, kind: d.kind, title: d.title, dueAt: santiagoToDate(d.date, d.time), templateKey: d.templateKey || null, note: d.note || null, isDemo: lead.isDemo },
  });
  if (!lead.brokerId) await prisma.lead.update({ where: { id: lead.id }, data: { brokerId: user.id } });
  await audit(user, "lead_task.create", "lead", lead.id, { task: t.id, kind: d.kind });
  refresh(lead.id);
}

export async function completeTaskAction(form: FormData): Promise<void> {
  const user = await requireUser("leads.write");
  const t = await taskInScope(user, z.string().parse(form.get("id")));
  if (!t || t.status !== "pendiente") return;
  const note = z.string().trim().max(500).optional().parse(form.get("note") || undefined);
  await prisma.leadTask.update({ where: { id: t.id }, data: { status: "hecho", doneAt: new Date(), note: note ?? t.note } });
  // Contactar a un lead nuevo lo pasa a contactado.
  const lead = await prisma.lead.findUnique({ where: { id: t.leadId }, select: { stage: true } });
  if (lead?.stage === "nuevo" && ["llamar", "whatsapp", "email"].includes(t.kind)) {
    await prisma.lead.update({ where: { id: t.leadId }, data: { stage: "contactado", stageChangedAt: new Date(), events: { create: { actorId: user.id, fromStage: "nuevo", toStage: "contactado", note: t.title } } } });
  }
  await audit(user, "lead_task.done", "lead", t.leadId, { task: t.id });
  refresh(t.leadId);
}

export async function postponeTaskAction(form: FormData): Promise<void> {
  const user = await requireUser("leads.write");
  const t = await taskInScope(user, z.string().parse(form.get("id")));
  if (!t || t.status !== "pendiente") return;
  const days = z.coerce.number().int().min(1).max(14).catch(1).parse(form.get("days"));
  const base = Math.max(t.dueAt.getTime(), Date.now());
  await prisma.leadTask.update({ where: { id: t.id }, data: { dueAt: new Date(base + days * 86_400_000) } });
  await audit(user, "lead_task.postpone", "lead", t.leadId, { task: t.id, days });
  refresh(t.leadId);
}

export async function cancelTaskAction(form: FormData): Promise<void> {
  const user = await requireUser("leads.write");
  const t = await taskInScope(user, z.string().parse(form.get("id")));
  if (!t || t.status !== "pendiente") return;
  await prisma.leadTask.update({ where: { id: t.id }, data: { status: "cancelado", doneAt: new Date() } });
  await audit(user, "lead_task.cancel", "lead", t.leadId, { task: t.id });
  refresh(t.leadId);
}
