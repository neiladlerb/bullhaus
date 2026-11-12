import Link from "next/link";
import {
  formatDate,
  formatPrice,
  KIND_LABELS,
  LEAD_KINDS,
  LEAD_SOURCES,
  pipelineOf,
  rate,
  SOCIAL_SOURCES,
  SOURCE_LABELS,
  STAGE_LABELS,
  type LeadKind,
  type LeadSource,
} from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import { Bars, Kpi, WeekColumns } from "@/components/bars";
import { requireUser } from "@/lib/auth";
import { DAY, leadScope, since } from "@/lib/leads";

const isKind = (v: unknown): v is LeadKind => (LEAD_KINDS as readonly string[]).includes(String(v));
const isSource = (v: unknown): v is LeadSource => (LEAD_SOURCES as readonly string[]).includes(String(v));

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("leads.read");
  const sp = await searchParams;
  const scope = leadScope(user);
  const last30 = { ...scope, createdAt: { gte: since(30) } };

  const where: Prisma.LeadWhereInput = { ...scope };
  if (isKind(sp.tipo)) where.kind = sp.tipo;
  if (isSource(sp.fuente)) where.source = sp.fuente;
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { comuna: { contains: sp.q, mode: "insensitive" } }];

  const [bySource30, byKind30, prev30, won30, list, weekly, campaigns] = await Promise.all([
    prisma.lead.groupBy({ by: ["source"], where: last30, _count: true }),
    prisma.lead.groupBy({ by: ["kind"], where: last30, _count: true }),
    prisma.lead.count({ where: { ...scope, createdAt: { gte: since(60), lt: since(30) } } }),
    prisma.lead.count({ where: { ...last30, stage: "ganado" } }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { property: { select: { id: true, code: true } }, broker: { select: { name: true } }, campaign: { select: { id: true, name: true } } },
    }),
    prisma.lead.findMany({ where: { ...scope, createdAt: { gte: since(84) } }, select: { createdAt: true, source: true } }),
    prisma.campaign.findMany({
      where: { tenantId: user.tenantId, status: { in: ["activa", "finalizada"] } },
      orderBy: { startsAt: "desc" },
      take: 6,
      include: { _count: { select: { leads: true } } },
    }),
  ]);

  const total30 = bySource30.reduce((a, b) => a + b._count, 0);
  const social30 = bySource30.filter((b) => SOCIAL_SOURCES.includes(b.source)).reduce((a, b) => a + b._count, 0);
  const owners30 = byKind30.find((k) => k.kind === "propietario")?._count ?? 0;
  const delta = prev30 ? Math.round(((total30 - prev30) / prev30) * 100) : 0;

  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = Date.now() - (12 - i) * 7 * DAY;
    const inWeek = weekly.filter((l) => l.createdAt.getTime() >= start && l.createdAt.getTime() < start + 7 * DAY);
    return {
      label: formatDate(new Date(start)).slice(0, 5),
      social: inWeek.filter((l) => SOCIAL_SOURCES.includes(l.source)).length,
      other: inWeek.filter((l) => !SOCIAL_SOURCES.includes(l.source)).length,
    };
  });

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter((e): e is [string, string] => Boolean(e[1])));
    return `/leads?${p}`;
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="mt-1 text-sm text-muted">Contactos de redes sociales, WhatsApp, web y portales. Últimos 30 días salvo que se indique.</p>
        </div>
        <Link href="/pipeline" className="btn-ghost">
          Ver pipeline
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Leads nuevos" value={total30.toLocaleString("es-CL")} sub={prev30 ? `${delta >= 0 ? "+" : ""}${delta} % vs. 30 días anteriores` : undefined} />
        <Kpi label="Desde redes sociales" value={social30.toLocaleString("es-CL")} sub={`${rate(social30, total30)} del total`} />
        <Kpi label="Propietarios (captación)" value={owners30.toLocaleString("es-CL")} sub={`${rate(owners30, total30)} del total`} />
        <Kpi label="Cerrados en el período" value={won30.toLocaleString("es-CL")} sub={`${rate(won30, total30)} de conversión`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-medium">Leads por semana (12 semanas)</h2>
          <div className="mt-4">
            <WeekColumns weeks={weeks} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Por fuente</h2>
          <div className="mt-4">
            <Bars
              rows={LEAD_SOURCES.map((s) => ({ label: SOURCE_LABELS[s], value: bySource30.find((b) => b.source === s)?._count ?? 0, accent: SOCIAL_SOURCES.includes(s) }))}
            />
          </div>
          <h2 className="mt-6 font-medium">Por tipo</h2>
          <div className="mt-4">
            <Bars rows={LEAD_KINDS.map((k) => ({ label: KIND_LABELS[k], value: byKind30.find((b) => b.kind === k)?._count ?? 0 }))} />
          </div>
        </div>
      </section>

      {campaigns.length > 0 && (
        <section className="card overflow-x-auto p-5">
          <h2 className="font-medium">Rendimiento de campañas en redes</h2>
          <table className="mt-3 w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-2 font-semibold">Campaña</th>
                <th className="font-semibold">Alcance</th>
                <th className="font-semibold">Clics</th>
                <th className="font-semibold">Leads</th>
                <th className="font-semibold">Inversión</th>
                <th className="font-semibold">Costo por lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="py-2">
                    <Link href={`/campanas/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                    {c.status === "activa" && <span className="chip ml-2 bg-green-100 text-green-800">Activa</span>}
                  </td>
                  <td className="tabular-nums">{c.reach.toLocaleString("es-CL")}</td>
                  <td className="tabular-nums">{c.clicks.toLocaleString("es-CL")}</td>
                  <td className="tabular-nums">{c._count.leads}</td>
                  <td className="tabular-nums">{formatPrice(c.spendClp, "CLP")}</td>
                  <td className="tabular-nums">{c._count.leads ? formatPrice(c.spendClp / c._count.leads, "CLP") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-medium">Últimos leads</h2>
          <form action="/leads" className="flex gap-2">
            {sp.tipo && <input type="hidden" name="tipo" value={sp.tipo} />}
            {sp.fuente && <input type="hidden" name="fuente" value={sp.fuente} />}
            <input name="q" defaultValue={sp.q} placeholder="Nombre o comuna" className="input w-48" />
          </form>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <Link href={qs({ tipo: undefined })} className={`chip ${!sp.tipo ? "bg-ink text-white" : "bg-paper"}`}>
            Todos
          </Link>
          {LEAD_KINDS.map((k) => (
            <Link key={k} href={qs({ tipo: k })} className={`chip ${sp.tipo === k ? "bg-ink text-white" : "bg-paper"}`}>
              {KIND_LABELS[k]}
            </Link>
          ))}
          <span className="mx-1 text-line">|</span>
          <Link href={qs({ fuente: undefined })} className={`chip ${!sp.fuente ? "bg-ink text-white" : "bg-paper"}`}>
            Todas las fuentes
          </Link>
          {LEAD_SOURCES.map((s) => (
            <Link key={s} href={qs({ fuente: s })} className={`chip ${sp.fuente === s ? "bg-ink text-white" : "bg-paper"}`}>
              {SOURCE_LABELS[s]}
            </Link>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-2 font-semibold">Fecha</th>
                <th className="font-semibold">Nombre</th>
                <th className="font-semibold">Tipo</th>
                <th className="font-semibold">Fuente</th>
                <th className="font-semibold">Interés</th>
                <th className="font-semibold">Etapa</th>
                <th className="font-semibold">Corredor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 tabular-nums text-muted">{formatDate(l.createdAt)}</td>
                  <td>
                    {l.name}
                    {l.isDemo && <span className="chip ml-1.5 bg-paper text-[10px] text-muted">demo</span>}
                  </td>
                  <td>{KIND_LABELS[l.kind].split(" ")[0]}</td>
                  <td>
                    {SOURCE_LABELS[l.source]}
                    {l.campaign && <span className="block text-xs text-muted">{l.campaign.name}</span>}
                  </td>
                  <td className="text-muted">
                    {l.property ? (
                      <Link href={`/propiedades/${l.property.id}`} className="hover:underline">
                        {l.property.code}
                      </Link>
                    ) : (
                      l.interest
                    )}
                    {l.comuna && ` · ${l.comuna}`}
                  </td>
                  <td>
                    <span className={`chip ${l.stage === "ganado" ? "bg-green-100 text-green-800" : l.stage === "perdido" ? "bg-red-50 text-red-700" : "bg-paper"}`}>
                      {STAGE_LABELS[pipelineOf(l.kind)][l.stage]}
                    </span>
                  </td>
                  <td className="text-muted">{l.broker?.name ?? "Sin asignar"}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted">
                    No hay leads con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
