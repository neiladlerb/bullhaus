import "server-only";
import { BUSY_STATUSES, freeSlots, isSlotFree, normalizeAvailability, type DaySlots, type Interval, type WeeklyAvailability } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import type { CurrentUser } from "./auth";

/** Un corredor ve su propia agenda; administración ve la de todos. */
export function agendaScope(user: Pick<CurrentUser, "id" | "tenantId" | "role">): Prisma.AppointmentWhereInput {
  return user.role === "corredor" ? { tenantId: user.tenantId, brokerId: user.id } : { tenantId: user.tenantId };
}

/** Duración de la visita y antelación mínima: las mismas que usa el agente de WhatsApp (Agentes IA, Ajustes). */
export async function visitSettings(tenantId: string): Promise<{ durationMin: number; minNoticeHours: number }> {
  const s = await prisma.agentSetting.findFirst({ where: { tenantId, channel: "whatsapp" }, select: { visitMinutes: true, minNoticeHours: true } });
  return { durationMin: s?.visitMinutes ?? 45, minNoticeHours: s?.minNoticeHours ?? 3 };
}

type Db = Prisma.TransactionClient | typeof prisma;

async function busyFor(tenantId: string, brokerId: string, from: Date, to: Date, db: Db = prisma): Promise<Interval[]> {
  const rows = await db.appointment.findMany({
    where: { tenantId, brokerId, status: { in: [...BUSY_STATUSES] }, endsAt: { gt: from }, startsAt: { lt: to } },
    select: { startsAt: true, endsAt: true },
  });
  return rows.map((r) => ({ start: r.startsAt, end: r.endsAt }));
}

/** Horarios libres del corredor a cargo, para los próximos `days` días. */
export async function brokerSlots(tenantId: string, brokerId: string, now = new Date(), days = 14): Promise<DaySlots[]> {
  const [broker, settings] = await Promise.all([
    prisma.user.findFirst({ where: { id: brokerId, tenantId, active: true }, select: { availability: true } }),
    visitSettings(tenantId),
  ]);
  if (!broker) return [];
  const busy = await busyFor(tenantId, brokerId, now, new Date(now.getTime() + (days + 1) * 86_400_000));
  return freeSlots({ now, availability: normalizeAvailability(broker.availability), busy, days, ...settings });
}

export interface SlotContext {
  availability: WeeklyAvailability;
  durationMin: number;
  minNoticeHours: number;
}

/** Horario y ajustes del corredor. Se leen ANTES de abrir la transacción (ver slotStillFree). */
export async function slotContext(tenantId: string, brokerId: string): Promise<SlotContext | null> {
  const [broker, settings] = await Promise.all([
    prisma.user.findFirst({ where: { id: brokerId, tenantId, active: true }, select: { availability: true } }),
    visitSettings(tenantId),
  ]);
  return broker ? { availability: normalizeAvailability(broker.availability), ...settings } : null;
}

/**
 * Vuelve a comprobar el horario justo antes de guardar: otra persona pudo tomarlo mientras se llenaba el formulario.
 * Dentro de una transacción solo usa `db` (la transacción): en producción hay una conexión por función
 * (connection_limit=1, docs/despliegue.md) y una consulta fuera de la transacción espera esa conexión hasta el
 * tiempo límite.
 */
export async function slotStillFree(tenantId: string, brokerId: string, start: Date, ctx: SlotContext, now = new Date(), db: Db = prisma): Promise<boolean> {
  const busy = await busyFor(tenantId, brokerId, new Date(start.getTime() - 86_400_000), new Date(start.getTime() + 86_400_000), db);
  return isSlotFree(start, { now, busy, ...ctx });
}
