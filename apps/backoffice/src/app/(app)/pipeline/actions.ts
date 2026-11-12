"use server";
import { revalidatePath } from "next/cache";
import { isLeadStage } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { leadScope } from "@/lib/leads";

export async function moveLeadAction(form: FormData): Promise<void> {
  const user = await requireUser("leads.write");
  const id = String(form.get("id") ?? "");
  const stage = form.get("stage");
  if (!isLeadStage(stage)) return;
  const lead = await prisma.lead.findFirst({ where: { id, ...leadScope(user) } });
  if (!lead || lead.stage === stage) return;
  await prisma.lead.update({
    where: { id },
    data: {
      stage,
      stageChangedAt: new Date(),
      // Quien mueve un lead sin corredor lo toma.
      brokerId: lead.brokerId ?? user.id,
      events: { create: { actorId: user.id, fromStage: lead.stage, toStage: stage } },
    },
  });
  await audit(user, "lead.stage", "lead", id, { from: lead.stage, to: stage });
  revalidatePath("/pipeline");
  revalidatePath("/leads");
}
