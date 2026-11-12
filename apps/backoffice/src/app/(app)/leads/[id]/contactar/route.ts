import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { can, mailtoLink, waLink } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { leadScope } from "@/lib/leads";
import { composeByKey, demoSendUrl } from "@/lib/outreach";

// Abre el WhatsApp o el correo del corredor con el mensaje prearmado para este lead. Con un lead de
// demostración muestra la simulación. El envío lo hace el corredor; aquí solo queda registrado.

const query = z.object({ canal: z.enum(["whatsapp", "email"]), t: z.string().max(40).optional(), task: z.string().optional() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const back = `/leads/${id}`;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (!user || !can(user.role, "leads.write")) return to("/login");
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return to(back);
  const lead = await prisma.lead.findFirst({ where: { id, ...leadScope(user) }, select: { id: true, name: true, phone: true, email: true, kind: true, isDemo: true, property: { select: { code: true } }, broker: { select: { name: true } } } });
  if (!lead) return to("/pipeline");
  const task = q.data.task ? await prisma.leadTask.findFirst({ where: { id: q.data.task, leadId: lead.id } }) : null;
  const key = q.data.t || task?.templateKey || "primer_contacto";
  const visit = task?.kind === "visita" ? task.dueAt : null;
  const msg = composeByKey(key, lead, lead.broker?.name ?? user.name, { fecha: visit });

  if (q.data.canal === "email" && !lead.email) return to(`${back}?error=sin-email`);
  if (q.data.canal === "whatsapp" && !lead.phone) return to(`${back}?error=sin-celular`);
  await audit(user, "lead.contact", "lead", lead.id, { channel: q.data.canal, template: key });

  if (lead.isDemo) {
    return to(demoSendUrl({ channel: q.data.canal, to: q.data.canal === "email" ? `${lead.name} <${lead.email}>` : `${lead.name} (${lead.phone})`, subject: q.data.canal === "email" ? msg.subject : undefined, text: msg.body, back }));
  }
  return NextResponse.redirect(q.data.canal === "whatsapp" ? waLink(msg.body, lead.phone) : mailtoLink(lead.email!, msg.subject, msg.body));
}
