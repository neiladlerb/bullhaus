"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APPOINTMENT_KINDS, APPOINTMENT_STATUSES, BUSY_STATUSES, canEditProperty, MILESTONES, parseRange, santiagoToDate, type WeeklyAvailability } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import { agendaScope } from "@/lib/agenda";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { getProperty } from "@/lib/properties";

export interface AgendaFormState {
  ok: boolean;
  message: string;
}

const createSchema = z.object({
  kind: z.enum(APPOINTMENT_KINDS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige el día"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Elige la hora"),
  minutes: z.coerce.number().int().min(15, "Mínimo 15 minutos").max(480, "Máximo 8 horas"),
  propertyId: z.string().optional(),
  brokerId: z.string().optional(),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, "Escribe un celular válido").optional(),
  title: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createAppointmentAction(_prev: AgendaFormState, form: FormData): Promise<AgendaFormState> {
  const user = await requireUser("leads.write");
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  const d = parsed.data;
  // Una visita necesita a quién se le muestra la propiedad (CLAUDE.md: no se agenda sin nombre).
  if (d.kind === "visita" && !d.contactName) return { ok: false, message: "Una visita necesita el nombre del contacto" };

  // El corredor agenda en su agenda; administración puede elegir a otro corredor activo.
  let brokerId = user.id;
  if (user.role !== "corredor" && d.brokerId) {
    const b = await prisma.user.findFirst({ where: { id: d.brokerId, tenantId: user.tenantId, active: true }, select: { id: true } });
    if (!b) return { ok: false, message: "Ese corredor no existe o está inactivo" };
    brokerId = b.id;
  }
  if (d.propertyId && !(await getProperty(user, d.propertyId))) return { ok: false, message: "No tienes acceso a esa propiedad" };

  const startsAt = santiagoToDate(d.date, d.time);
  const endsAt = new Date(startsAt.getTime() + d.minutes * 60_000);
  const clash = await prisma.appointment.findFirst({
    where: { tenantId: user.tenantId, brokerId, status: { in: [...BUSY_STATUSES] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    select: { id: true },
  });
  if (clash) return { ok: false, message: "Ese horario choca con otra cita del corredor" };

  const appt = await prisma.appointment.create({
    data: {
      tenantId: user.tenantId,
      kind: d.kind,
      status: "confirmada",
      source: "backoffice",
      startsAt,
      endsAt,
      brokerId,
      propertyId: d.propertyId || null,
      contactName: d.contactName || null,
      contactPhone: d.contactPhone || null,
      title: d.title || null,
      notes: d.notes || null,
      confirmedAt: new Date(),
      createdById: user.id,
    },
  });
  await audit(user, "appointment.create", "appointment", appt.id, { kind: d.kind });
  revalidatePath("/agenda");
  redirect(`/agenda?dia=${d.date}&creada=1`);
}

export async function setAppointmentStatusAction(form: FormData): Promise<void> {
  const user = await requireUser("leads.write");
  const id = String(form.get("id") ?? "");
  const status = z.enum(APPOINTMENT_STATUSES).safeParse(form.get("status"));
  if (!status.success) return;
  const appt = await prisma.appointment.findFirst({ where: { id, ...agendaScope(user) } });
  if (!appt || appt.status === status.data) return;
  const data: Prisma.AppointmentUpdateInput = { status: status.data };
  if (status.data === "confirmada") data.confirmedAt = new Date();
  await prisma.appointment.update({ where: { id }, data });
  // Si la visita se hizo, el lead pasa a "visita realizada" en su historial (la etapa la sigue moviendo el corredor).
  if (appt.leadId && status.data === "realizada") {
    await prisma.leadEvent.create({ data: { leadId: appt.leadId, actorId: user.id, note: "Visita realizada" } });
  }
  await audit(user, "appointment.status", "appointment", id, { from: appt.status, to: status.data });
  revalidatePath("/agenda");
  if (appt.propertyId) revalidatePath(`/propiedades/${appt.propertyId}`);
}

export async function saveAvailabilityAction(_prev: AgendaFormState, form: FormData): Promise<AgendaFormState> {
  const user = await requireUser("leads.write");
  const out = {} as WeeklyAvailability;
  for (const day of ["0", "1", "2", "3", "4", "5", "6"] as const) {
    const ranges: string[] = [];
    for (const slot of ["a", "b"]) {
      const from = String(form.get(`${day}-${slot}-from`) ?? "");
      const to = String(form.get(`${day}-${slot}-to`) ?? "");
      if (!from && !to) continue;
      const r = `${from}-${to}`;
      if (!parseRange(r)) return { ok: false, message: `Revisa el horario: ${from || "?"} a ${to || "?"} no es válido (la hora de término va después de la de inicio).` };
      ranges.push(r);
    }
    out[day] = ranges;
  }
  await prisma.user.update({ where: { id: user.id }, data: { availability: out } });
  await audit(user, "user.availability", "user", user.id);
  revalidatePath("/agenda/horario");
  return { ok: true, message: "Horario guardado. La web ya ofrece estos horarios para tus propiedades." };
}

export async function setMilestoneAction(form: FormData): Promise<void> {
  const user = await requireUser("properties.write");
  const propertyId = String(form.get("propertyId") ?? "");
  const key = String(form.get("key") ?? "");
  const property = await getProperty(user, propertyId);
  if (!property || !canEditProperty(user, property)) return;
  const def = MILESTONES[property.operation].find((m) => m.key === key);
  // Los hitos automáticos salen de los datos (mandato, fotos, publicación, visitas): no se marcan a mano.
  if (!def || def.auto) return;
  const done = typeof form.get("done") === "string" ? String(form.get("done")) : null;
  const due = String(form.get("dueAt") ?? "");
  const data: { doneAt?: Date | null; doneById?: string | null; dueAt?: Date | null } = {};
  if (done === "1") Object.assign(data, { doneAt: new Date(), doneById: user.id });
  if (done === "0") Object.assign(data, { doneAt: null, doneById: null });
  if (form.has("dueAt")) data.dueAt = /^\d{4}-\d{2}-\d{2}$/.test(due) ? santiagoToDate(due, "12:00") : null;
  await prisma.propertyMilestone.upsert({
    where: { propertyId_key: { propertyId, key } },
    create: { propertyId, key, ...data },
    update: data,
  });
  await audit(user, "property.milestone", "property", propertyId, { key, done: done ?? null, due: due || null });
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/agenda");
}
