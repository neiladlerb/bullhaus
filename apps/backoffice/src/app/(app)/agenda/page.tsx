import Link from "next/link";
import {
  addDaysKey,
  APPOINTMENT_KIND_LABELS,
  APPOINTMENT_STATUS_LABELS,
  can,
  dayStart,
  formatDayLong,
  formatTime,
  localDayKey,
  MILESTONES,
  TASK_KIND_LABELS,
  visitConfirmationText,
  weekStartKey,
  WEEKDAY_LABELS,
  whatsappUrl,
  type AppointmentStatus,
} from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { ConfirmSubmit } from "@bullhaus/ui/confirm-submit";
import { DemoTag } from "@/components/demo";
import { agendaScope, visitSettings } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { leadScope } from "@/lib/leads";
import { activeBrokers } from "@/lib/properties";
import { setAppointmentStatusAction } from "./actions";
import { NewAppointmentForm } from "./forms";

const STATUS_TONE: Record<AppointmentStatus, string> = {
  por_confirmar: "bg-warning-soft text-warning",
  confirmada: "bg-info-soft text-info",
  realizada: "bg-success-soft text-success",
  no_asistio: "bg-danger-soft text-danger",
  cancelada: "bg-paper text-muted",
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const short = (key: string) => key.split("-").reverse().slice(0, 2).join("/");

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("leads.read");
  const sp = await searchParams;
  const editable = can(user.role, "leads.write");
  const today = localDayKey(new Date());
  const monday = weekStartKey(sp.dia && DAY_RE.test(sp.dia) ? sp.dia : today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i));
  const from = dayStart(monday);
  const to = dayStart(addDaysKey(monday, 7));

  const isAdmin = user.role !== "corredor";
  const brokers = isAdmin ? await activeBrokers(user.tenantId) : [];
  const brokerFilter = isAdmin && sp.corredor ? sp.corredor : undefined;
  const scope = { ...agendaScope(user), ...(brokerFilter ? { brokerId: brokerFilter } : {}) };
  const propertyScope = user.role === "corredor" ? { brokerId: user.id } : brokerFilter ? { brokerId: brokerFilter } : {};

  const [appointments, pending, tasks, milestones, properties, tenant, settings] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...scope, startsAt: { gte: from, lt: to } },
      orderBy: { startsAt: "asc" },
      include: { property: { select: { id: true, code: true, comuna: true, addressPrivate: true } }, broker: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: { ...scope, status: "por_confirmar", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 20,
      include: { property: { select: { code: true } }, broker: { select: { name: true } } },
    }),
    prisma.leadTask.findMany({
      where: {
        tenantId: user.tenantId,
        status: "pendiente",
        dueAt: { gte: from, lt: to },
        lead: { ...leadScope(user), ...(brokerFilter ? { brokerId: brokerFilter } : {}) },
      },
      orderBy: { dueAt: "asc" },
      include: { lead: { select: { id: true, name: true } } },
    }),
    prisma.propertyMilestone.findMany({
      where: { doneAt: null, dueAt: { gte: from, lt: to }, property: { tenantId: user.tenantId, ...propertyScope } },
      include: { property: { select: { id: true, code: true, operation: true } } },
    }),
    prisma.property.findMany({
      where: { tenantId: user.tenantId, ...propertyScope, status: { notIn: ["vendida", "arrendada", "retirada"] } },
      orderBy: { code: "asc" },
      select: { id: true, code: true, comuna: true },
      take: 500,
    }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } }),
    visitSettings(user.tenantId),
  ]);

  type Item =
    | { type: "cita"; at: Date; a: (typeof appointments)[number] }
    | { type: "tarea"; at: Date; t: (typeof tasks)[number] }
    | { type: "hito"; at: Date; m: (typeof milestones)[number] };
  const items: Item[] = [
    ...appointments.map((a) => ({ type: "cita" as const, at: a.startsAt, a })),
    ...tasks.map((t) => ({ type: "tarea" as const, at: t.dueAt, t })),
    ...milestones.map((m) => ({ type: "hito" as const, at: m.dueAt!, m })),
  ].sort((x, y) => x.at.getTime() - y.at.getTime());
  const byDay = new Map(days.map((d) => [d, items.filter((i) => localDayKey(i.at) === d)]));

  const weekLink = (key: string) => {
    const q = new URLSearchParams({ dia: key });
    if (brokerFilter) q.set("corredor", brokerFilter);
    return `/agenda?${q}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="mt-1 text-sm text-muted">Visitas, tasaciones, llamadas, tareas de seguimiento e hitos de las propiedades. Las visitas que se piden desde la web llegan como “Por confirmar”.</p>
        </div>
        <Link href="/agenda/horario" className="btn-ghost">Mi horario de visitas</Link>
      </div>

      {sp.creada && <p className="rounded-md bg-success-soft px-4 py-3 text-sm text-success">Cita guardada.</p>}

      {pending.length > 0 && (
        <section className="card border-warning p-5" aria-labelledby="por-confirmar">
          <h2 id="por-confirmar" className="font-semibold">Visitas pedidas desde la web: confírmalas</h2>
          <p className="mt-1 text-sm text-muted">El horario ya quedó reservado. Al confirmar, envía la confirmación con la dirección por WhatsApp desde la cita.</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>
                  <span className="block font-semibold">{formatDayLong(p.startsAt)}, {formatTime(p.startsAt)}</span>
                  <span className="text-muted">
                    {p.contactName}, propiedad {p.property?.code ?? "sin código"}
                    {isAdmin ? `. Corredor: ${p.broker.name}` : ""}
                  </span>
                </span>
                {editable && (
                  <form action={setAppointmentStatusAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value="confirmada" />
                    <button className="btn-primary">Confirmar visita</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {editable && (
        <details className="card p-5" open={sp.nueva === "1"}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold">
            Nueva cita
            <span className="btn-brand pointer-events-none">Agendar</span>
          </summary>
          <div className="mt-4">
            <NewAppointmentForm
              today={today}
              defaultMinutes={settings.durationMin}
              properties={properties.map((p) => ({ id: p.id, label: `${p.code}, ${p.comuna}` }))}
              brokers={isAdmin ? brokers.map((b) => ({ id: b.id, name: b.name })) : null}
            />
          </div>
        </details>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Semana del {short(days[0]!)} al {short(days[6]!)}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <form className="flex items-center gap-2" action="/agenda">
              <input type="hidden" name="dia" value={monday} />
              <label htmlFor="ag-broker" className="text-sm text-muted">Corredor</label>
              <select id="ag-broker" name="corredor" defaultValue={brokerFilter ?? ""} className="input w-48">
                <option value="">Todos</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button className="btn-ghost">Ver</button>
            </form>
          )}
          {/* Tres botones del mismo tamaño (skill diseno-bullhaus: elementos que van juntos miden lo mismo). */}
          <nav aria-label="Cambiar de semana" className="grid grid-cols-3 gap-2">
            <Link href={weekLink(addDaysKey(monday, -7))} className="btn-ghost">Anterior</Link>
            <Link href={weekLink(today)} className="btn-ghost">Hoy</Link>
            <Link href={weekLink(addDaysKey(monday, 7))} className="btn-ghost">Siguiente</Link>
          </nav>
        </div>
      </div>

      <ol className="grid gap-3 lg:grid-cols-7">
        {days.map((d, i) => {
          const list = byDay.get(d) ?? [];
          const isToday = d === today;
          return (
            <li key={d} className={`card flex min-h-32 flex-col p-3 ${isToday ? "border-ink ring-1 ring-ink" : ""}`}>
              <p className="text-sm font-semibold">
                {WEEKDAY_LABELS[(i + 1) % 7]} {short(d)}
                {isToday && <span className="ml-2 chip bg-ink text-white">Hoy</span>}
              </p>
              {list.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Sin actividades</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {list.map((it) => {
                    if (it.type === "tarea") {
                      return (
                        <li key={`t-${it.t.id}`} className="rounded-md border border-line p-2 text-sm">
                          <p className="font-semibold">{formatTime(it.at)} {TASK_KIND_LABELS[it.t.kind]}</p>
                          <Link href={`/leads/${it.t.lead.id}`} className="text-muted hover:underline">{it.t.title}: {it.t.lead.name}</Link>
                        </li>
                      );
                    }
                    if (it.type === "hito") {
                      const label = MILESTONES[it.m.property.operation].find((m) => m.key === it.m.key)?.label ?? it.m.key;
                      return (
                        <li key={`m-${it.m.id}`} className="rounded-md border border-dashed border-line-strong p-2 text-sm">
                          <p className="font-semibold">Hito: {label}</p>
                          <Link href={`/propiedades/${it.m.property.id}#hitos`} className="text-muted hover:underline">{it.m.property.code}</Link>
                        </li>
                      );
                    }
                    const a = it.a;
                    const waText =
                      a.contactPhone && a.status === "confirmada" && a.kind === "visita"
                        ? visitConfirmationText({ contactName: a.contactName ?? "", when: a.startsAt, propertyCode: a.property?.code ?? null, address: a.property?.addressPrivate ?? null, brokerName: a.broker.name, brandName: tenant?.name ?? "" })
                        : null;
                    return (
                      <li key={a.id} className={`rounded-md border p-2 text-sm ${a.status === "cancelada" ? "border-line opacity-60" : "border-line-strong"}`}>
                        <details>
                          <summary className="cursor-pointer list-none">
                            <p className="font-semibold">
                              {formatTime(a.startsAt)}–{formatTime(a.endsAt)} {APPOINTMENT_KIND_LABELS[a.kind]}
                              {a.isDemo && <DemoTag />}
                            </p>
                            <span className={`chip mt-1 ${STATUS_TONE[a.status]}`}>{APPOINTMENT_STATUS_LABELS[a.status]}</span>
                            {(a.contactName ?? a.title) && <p className="mt-1">{a.contactName ?? a.title}</p>}
                            {a.property && <p className="text-muted">{a.property.code}</p>}
                            {isAdmin && !brokerFilter && <p className="text-xs text-muted">{a.broker.name}</p>}
                          </summary>
                          <div className="mt-2 space-y-2 border-t border-line pt-2">
                            {a.property && <Link href={`/propiedades/${a.property.id}`} className="block hover:underline">Ver propiedad {a.property.code}</Link>}
                            {a.contactPhone && <p className="text-muted">Celular: {a.contactPhone}</p>}
                            {a.notes && <p className="text-muted">{a.notes}</p>}
                            {a.source === "web" && <p className="text-xs text-muted">Pedida desde la web</p>}
                            {waText && (
                              <a href={whatsappUrl(a.contactPhone!, waText)} target="_blank" rel="noopener" className="btn-primary w-full">
                                Enviar confirmación por WhatsApp
                              </a>
                            )}
                            {editable && (
                              <div className="grid gap-2">
                                {a.status === "por_confirmar" && <StatusButton id={a.id} status="confirmada" label="Confirmar" />}
                                {a.status === "confirmada" && (
                                  <>
                                    <StatusButton id={a.id} status="realizada" label="Marcar realizada" />
                                    <StatusButton id={a.id} status="no_asistio" label="No asistió" />
                                  </>
                                )}
                                {(a.status === "por_confirmar" || a.status === "confirmada") && (
                                  <form action={setAppointmentStatusAction}>
                                    <input type="hidden" name="id" value={a.id} />
                                    <input type="hidden" name="status" value="cancelada" />
                                    <ConfirmSubmit
                                      title="¿Cancelar la cita?"
                                      consequence={a.source === "web" ? "El horario queda libre en la web. Avísale al contacto por WhatsApp: el sistema no le escribe solo." : "El horario queda libre."}
                                      confirmLabel="Cancelar cita"
                                      className="btn-danger w-full"
                                    >
                                      Cancelar cita
                                    </ConfirmSubmit>
                                  </form>
                                )}
                              </div>
                            )}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusButton({ id, status, label }: { id: string; status: AppointmentStatus; label: string }) {
  return (
    <form action={setAppointmentStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="btn-ghost w-full">{label}</button>
    </form>
  );
}
