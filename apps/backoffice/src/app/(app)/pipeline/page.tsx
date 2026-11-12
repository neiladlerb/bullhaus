import Link from "next/link";
import { can, daysUntil, dueState, formatDateTimeCl, formatPrice, LEAD_STAGES, OPEN_STAGES, rate, SOURCE_LABELS, STAGE_LABELS, santiagoToDate, TASK_KIND_LABELS, TIMEZONE, type Pipeline } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Kpi } from "@/components/bars";
import { Chip } from "@/components/demo";
import { DUE_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { leadScope, since } from "@/lib/leads";
import { moveLeadAction } from "./actions";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("leads.read");
  const sp = await searchParams;
  const pipeline: Pipeline = sp.p === "captacion" ? "captacion" : "demanda";
  const kinds = pipeline === "captacion" ? (["propietario"] as const) : (["comprador", "arrendatario"] as const);
  const where = { ...leadScope(user), kind: { in: [...kinds] } };
  const editable = can(user.role, "leads.write");

  // Fin del día de hoy en Santiago: lo que vence hasta entonces es "hoy" o "vencido".
  const endOfToday = santiagoToDate(new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date()), "23:59");
  const [open, closed90, byStage90, reminders] = await Promise.all([
    prisma.lead.findMany({
      where: { ...where, stage: { in: [...OPEN_STAGES] } },
      orderBy: { stageChangedAt: "desc" },
      include: { property: { select: { id: true, code: true, comuna: true } }, broker: { select: { name: true } }, tasks: { where: { status: "pendiente" }, orderBy: { dueAt: "asc" }, take: 1 } },
      take: 400,
    }),
    prisma.lead.groupBy({ by: ["stage"], where: { ...where, stage: { in: ["ganado", "perdido"] }, stageChangedAt: { gte: since(90) } }, _count: true }),
    prisma.lead.groupBy({ by: ["stage"], where: { ...where, createdAt: { gte: since(90) } }, _count: true }),
    prisma.leadTask.findMany({
      where: { tenantId: user.tenantId, status: "pendiente", dueAt: { lte: endOfToday }, lead: { ...where, stage: { in: [...OPEN_STAGES] } } },
      orderBy: { dueAt: "asc" },
      take: 40,
      include: { lead: { select: { id: true, name: true, isDemo: true } }, owner: { select: { name: true } } },
    }),
  ]);
  const overdue = reminders.filter((t) => dueState(t.dueAt) === "vencido").length;

  const labels = STAGE_LABELS[pipeline];
  const won = closed90.find((c) => c.stage === "ganado")?._count ?? 0;
  const lost = closed90.find((c) => c.stage === "perdido")?._count ?? 0;
  const created90 = byStage90.reduce((a, b) => a + b._count, 0);
  // Embudo: cuántos de los creados en 90 días llegaron al menos a cada etapa.
  const order = LEAD_STAGES.filter((s) => s !== "perdido");
  const reached = (s: (typeof order)[number]) =>
    byStage90.filter((b) => b.stage !== "perdido" && order.indexOf(b.stage as (typeof order)[number]) >= order.indexOf(s)).reduce((a, b) => a + b._count, 0);
  const pipelineValue = open
    .filter((l) => l.stage === "propuesta" && l.budget && l.budgetCurrency === "UF")
    .reduce((a, l) => a + Number(l.budget), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="mt-1 text-sm text-muted">
            {pipeline === "captacion" ? "Propietarios que quieren vender o arrendar: de la tasación al mandato." : "Compradores y arrendatarios: del primer contacto al cierre."}
          </p>
        </div>
        <div className="flex rounded-md border border-line bg-white p-0.5 text-sm">
          <Link href="/pipeline" className={`rounded px-3 py-1.5 ${pipeline === "demanda" ? "bg-ink text-white" : ""}`}>
            Demanda
          </Link>
          <Link href="/pipeline?p=captacion" className={`rounded px-3 py-1.5 ${pipeline === "captacion" ? "bg-ink text-white" : ""}`}>
            Captación
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Abiertos" value={open.length.toLocaleString("es-CL")} sub={`${open.filter((l) => !l.tasks.length).length} sin próximo compromiso`} />
        <Kpi label={`${labels.ganado} (90 días)`} value={won.toLocaleString("es-CL")} sub={`${rate(won, won + lost)} de los cerrados`} />
        <Kpi label="Perdidos (90 días)" value={lost.toLocaleString("es-CL")} />
        {pipeline === "demanda" ? (
          <Kpi label="En etapa de oferta" value={pipelineValue ? formatPrice(pipelineValue, "UF") : "—"} sub="Suma de precios en UF de las propiedades" />
        ) : (
          <Kpi label="Tasaciones agendadas" value={String(open.filter((l) => l.stage === "visita").length)} />
        )}
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">Compromisos de hoy y vencidos</h2>
          <span className="text-xs text-muted">{reminders.length} para hoy · {overdue} vencidos</span>
        </div>
        {reminders.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nada pendiente para hoy.</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {reminders.map((t) => {
              const due = dueState(t.dueAt);
              return (
                <li key={t.id}>
                  <Link href={`/leads/${t.lead.id}`} className="flex items-start gap-2 rounded-md border border-line p-2.5 text-sm hover:bg-paper">
                    <Chip tone={DUE_TONE[due]}>{due === "vencido" ? "Vencido" : formatDateTimeCl(t.dueAt).slice(11)}</Chip>
                    <span className="min-w-0">
                      <span className="font-medium">{t.lead.name}</span> · {TASK_KIND_LABELS[t.kind]}
                      <span className="block truncate text-xs text-muted">{t.title} · {t.owner?.name ?? "sin responsable"}{due === "vencido" ? ` · ${formatDateTimeCl(t.dueAt)}` : ""}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-medium">Embudo de los últimos 90 días</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {order.map((s, i) => {
            const n = reached(s);
            return (
              <div key={s} className="rounded-md bg-paper p-3">
                <p className="text-xs text-muted">{labels[s]}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{n}</p>
                <p className="text-[11px] text-muted">{i === 0 ? `${created90} creados` : `${rate(n, created90)}`}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="grid min-w-[1100px] grid-cols-5 gap-3">
          {OPEN_STAGES.map((stage) => {
            const cards = open.filter((l) => l.stage === stage);
            return (
              <div key={stage} className="rounded-lg bg-white/60 p-2">
                <h3 className="flex items-center justify-between px-1 py-1 text-sm font-semibold text-heading">
                  {labels[stage]} <span className="chip bg-paper tabular-nums">{cards.length}</span>
                </h3>
                <ul className="mt-1 max-h-[70vh] space-y-2 overflow-y-auto">
                  {cards.slice(0, 60).map((l) => {
                    const idle = -daysUntil(l.stageChangedAt);
                    return (
                      <li key={l.id} className="card p-3 text-sm">
                        <p className="font-medium">
                          <Link href={`/leads/${l.id}`} className="hover:underline">{l.name}</Link>
                          {l.isDemo && <span className="chip ml-1 bg-paper text-[10px] text-muted">demo</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {SOURCE_LABELS[l.source]} · {l.kind === "propietario" ? l.interest : l.property ? `${l.property.code} · ${l.property.comuna}` : l.kind}
                          {l.kind === "propietario" && l.comuna ? ` · ${l.comuna}` : ""}
                        </p>
                        {l.budget && l.budgetCurrency && <p className="mt-0.5 text-xs tabular-nums">{formatPrice(Number(l.budget), l.budgetCurrency)}</p>}
                        {l.tasks[0] ? (
                          <p className="mt-1 flex items-center gap-1 text-[11px]">
                            <Chip tone={DUE_TONE[dueState(l.tasks[0].dueAt)]}>{TASK_KIND_LABELS[l.tasks[0].kind]}</Chip>
                            <span className="truncate text-muted">{formatDateTimeCl(l.tasks[0].dueAt)}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-amber-700">Sin próximo compromiso</p>
                        )}
                        <p className={`mt-1 text-[11px] ${idle > 7 ? "text-amber-700" : "text-muted"}`}>
                          {l.broker?.name ?? "Sin asignar"} · {idle === 0 ? "hoy" : `hace ${idle} d`}
                        </p>
                        {editable && (
                          <form action={moveLeadAction} className="mt-2 flex gap-1">
                            <input type="hidden" name="id" value={l.id} />
                            <select name="stage" defaultValue={l.stage} className="input py-1 text-xs" aria-label="Mover a etapa">
                              {LEAD_STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {labels[s]}
                                </option>
                              ))}
                            </select>
                            <button className="btn-ghost px-2 py-1 text-xs">Mover</button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                  {cards.length > 60 && <li className="px-1 text-xs text-muted">y {cards.length - 60} más</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
