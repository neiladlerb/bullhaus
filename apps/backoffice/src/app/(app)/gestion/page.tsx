import Link from "next/link";
import { formatDate, formatPrice, rate, SOCIAL_SOURCES, SOURCE_LABELS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Bars, Kpi } from "@/components/bars";
import { Chip, SimulatedNote } from "@/components/demo";
import { PairColumns } from "@/components/line-chart";
import { requireUser } from "@/lib/auth";
import { DAY, since } from "@/lib/leads";

const clp = (n: number) => formatPrice(n, "CLP");
const num = (n: number) => n.toLocaleString("es-CL");

export default async function GestionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("analytics.read");
  const sp = await searchParams;
  const days = sp.dias === "90" ? 90 : sp.dias === "7" ? 7 : 30;
  const from = since(days);
  const t = user.tenantId;
  const [ads, leads, events, closed, invoices, web, igDaily, ads3, demo] = await Promise.all([
    prisma.adMetricDaily.findMany({ where: { tenantId: t, date: { gte: from } } }),
    prisma.lead.findMany({ where: { tenantId: t, createdAt: { gte: from } }, select: { source: true, createdAt: true, propertyId: true, stage: true } }),
    prisma.leadEvent.findMany({ where: { lead: { tenantId: t }, createdAt: { gte: from }, toStage: { in: ["visita", "propuesta"] } }, select: { toStage: true } }),
    prisma.deal.count({ where: { tenantId: t, closedAt: { gte: from } } }),
    prisma.invoice.findMany({ where: { tenantId: t, issuedAt: { gte: from }, status: { in: ["emitida", "pagada", "vencida"] } }, select: { kind: true, netClp: true } }),
    prisma.webMetricDaily.findMany({ where: { tenantId: t, date: { gte: from } } }),
    prisma.socialDaily.findMany({ where: { account: { tenantId: t, platform: "instagram" }, date: { gte: from } } }),
    prisma.adMetricDaily.groupBy({ by: ["campaignName", "platform"], where: { tenantId: t, date: { gte: since(4) } }, _sum: { spendClp: true, leads: true } }),
    prisma.adMetricDaily.count({ where: { tenantId: t, isDemo: true } }),
  ]);

  const sumBy = (p: "meta" | "google", k: "spendClp" | "impressions" | "clicks" | "leads") => ads.filter((a) => a.platform === p).reduce((s, a) => s + a[k], 0);
  const spend = sumBy("meta", "spendClp") + sumBy("google", "spendClp");
  const impressions = sumBy("meta", "impressions") + sumBy("google", "impressions");
  const clicks = sumBy("meta", "clicks") + sumBy("google", "clicks");
  const contacts = leads.length;
  const paidContacts = leads.filter((l) => SOCIAL_SOURCES.includes(l.source) || l.source === "web").length;
  const visits = events.filter((e) => e.toStage === "visita").length;
  const offers = events.filter((e) => e.toStage === "propuesta").length;
  const commission = invoices.reduce((s, i) => s + (i.kind === "nota_credito" ? -1 : 1) * i.netClp, 0);
  const roas = spend ? commission / spend : 0;
  const ws = (k: "sessions" | "propertyViews" | "whatsappClicks" | "forms") => web.reduce((s, w) => s + w[k], 0);

  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = Date.now() - (12 - i) * 7 * DAY;
    const end = start + 7 * DAY;
    return { start, end, label: formatDate(new Date(start)).slice(0, 5) };
  });
  const [adsAll, leadsAll] = await Promise.all([
    prisma.adMetricDaily.findMany({ where: { tenantId: t, date: { gte: new Date(weeks[0]!.start) } }, select: { date: true, spendClp: true } }),
    prisma.lead.findMany({ where: { tenantId: t, createdAt: { gte: new Date(weeks[0]!.start) } }, select: { createdAt: true } }),
  ]);
  const weekly = weeks.map((w) => ({
    label: w.label,
    a: adsAll.filter((x) => x.date.getTime() >= w.start && x.date.getTime() < w.end).reduce((s, x) => s + x.spendClp, 0),
    b: leadsAll.filter((x) => x.createdAt.getTime() >= w.start && x.createdAt.getTime() < w.end).length,
  }));

  // Alertas (docs/plataforma.md 3.7).
  const alerts: { tone: "red" | "amber"; text: string; href?: string }[] = [];
  for (const c of ads3) if ((c._sum.spendClp ?? 0) > 0 && (c._sum.leads ?? 0) === 0) alerts.push({ tone: "red", text: `"${c.campaignName}" gastó ${clp(c._sum.spendClp ?? 0)} en los últimos 3 días sin generar contactos.`, href: c.platform === "meta" ? "/campanas" : undefined });
  const perProp = new Map<string, { n: number; visit: boolean }>();
  for (const l of leads) if (l.propertyId) {
    const cur = perProp.get(l.propertyId) ?? { n: 0, visit: false };
    perProp.set(l.propertyId, { n: cur.n + 1, visit: cur.visit || ["visita", "propuesta", "ganado"].includes(l.stage) });
  }
  const cold = [...perProp.entries()].filter(([, v]) => v.n >= 3 && !v.visit);
  if (cold.length) {
    const codes = await prisma.property.findMany({ where: { id: { in: cold.map(([id]) => id) } }, select: { id: true, code: true } });
    for (const p of codes.slice(0, 4)) alerts.push({ tone: "amber", text: `La propiedad ${p.code} tiene ${perProp.get(p.id)!.n} contactos y ninguna visita agendada.`, href: `/propiedades/${p.id}` });
  }
  const formsLast = web.slice(-7).reduce((s, w) => s + w.forms, 0);
  const formsPrev = web.slice(-14, -7).reduce((s, w) => s + w.forms, 0);
  if (formsPrev && formsLast < formsPrev * 0.7) alerts.push({ tone: "amber", text: `Los formularios del sitio bajaron de ${formsPrev} a ${formsLast} contra la semana anterior.` });

  const sources = [
    { name: "Meta Ads (Instagram y Facebook)", spend: sumBy("meta", "spendClp"), imp: sumBy("meta", "impressions"), clicks: sumBy("meta", "clicks"), leads: sumBy("meta", "leads") },
    { name: "Google Ads (búsqueda)", spend: sumBy("google", "spendClp"), imp: sumBy("google", "impressions"), clicks: sumBy("google", "clicks"), leads: sumBy("google", "leads") },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Control de gestión</h1>
          <p className="mt-1 text-sm text-muted">Del anuncio a la comisión facturada: cuánto cuesta cada etapa y qué retorna la inversión publicitaria.</p>
        </div>
        <div className="flex gap-1.5 text-sm">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/gestion?dias=${d}`} className={`chip px-3 py-1 ${days === d ? "bg-ink text-white" : "bg-white"}`}>{d} días</Link>
          ))}
        </div>
      </div>
      {demo > 0 && <SimulatedNote what="Gasto, clics y visitas al sitio son simulados; contactos, visitas, cierres y comisiones salen de los datos de demostración del back office." integration="Meta Ads, Google Ads y Google Analytics 4" />}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Inversión publicitaria" value={clp(spend)} sub={`Meta ${clp(sumBy("meta", "spendClp"))} · Google ${clp(sumBy("google", "spendClp"))}`} />
        <Kpi label="Costo por contacto" value={paidContacts ? clp(spend / paidContacts) : "—"} sub={`${num(paidContacts)} contactos de redes y web`} />
        <Kpi label="Costo por visita" value={visits ? clp(spend / visits) : "—"} sub={`${num(visits)} visitas y tasaciones`} />
        <Kpi label="Retorno (comisión / inversión)" value={spend ? `${roas.toLocaleString("es-CL", { maximumFractionDigits: 1 })}x` : "—"} sub={`${clp(commission)} de comisión facturada`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-medium">Embudo del período</h2>
          <div className="mt-4">
            <Bars
              rows={[
                { label: "Impresiones", value: impressions },
                { label: "Clics", value: clicks },
                { label: "Contactos", value: contacts, accent: true },
                { label: "Visitas", value: visits, accent: true },
                { label: "Ofertas", value: offers, accent: true },
                { label: "Cierres", value: closed, accent: true },
              ]}
            />
          </div>
          <p className="mt-3 text-xs text-muted">CTR {rate(clicks, impressions)} · contacto a visita {rate(visits, contacts)} · visita a oferta {rate(offers, visits)} · oferta a cierre {rate(closed, offers)}</p>
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-medium">Inversión y contactos por semana</h2>
          <div className="mt-4">
            <PairColumns rows={weekly} aLabel="Inversión" bLabel="Contactos" formatA={clp} formatB={num} />
          </div>
        </div>
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="font-medium">Por fuente pagada</h2>
        <table className="mt-3 w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-2 font-semibold">Fuente</th>
              <th className="font-semibold">Inversión</th>
              <th className="font-semibold">Impresiones</th>
              <th className="font-semibold">Clics</th>
              <th className="font-semibold">CTR</th>
              <th className="font-semibold">CPC</th>
              <th className="font-semibold">Contactos</th>
              <th className="font-semibold">Costo por contacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sources.map((s) => (
              <tr key={s.name}>
                <td className="py-2">{s.name}</td>
                <td className="tabular-nums">{clp(s.spend)}</td>
                <td className="tabular-nums">{num(s.imp)}</td>
                <td className="tabular-nums">{num(s.clicks)}</td>
                <td className="tabular-nums">{rate(s.clicks, s.imp)}</td>
                <td className="tabular-nums">{s.clicks ? clp(s.spend / s.clicks) : "—"}</td>
                <td className="tabular-nums">{num(s.leads)}</td>
                <td className="tabular-nums">{s.leads ? clp(s.spend / s.leads) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-medium">Sitio web (GA4)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-muted">Sesiones</span><span className="tabular-nums">{num(ws("sessions"))}</span></li>
            <li className="flex justify-between"><span className="text-muted">Vistas de fichas</span><span className="tabular-nums">{num(ws("propertyViews"))}</span></li>
            <li className="flex justify-between"><span className="text-muted">Clics a WhatsApp</span><span className="tabular-nums">{num(ws("whatsappClicks"))}</span></li>
            <li className="flex justify-between"><span className="text-muted">Formularios</span><span className="tabular-nums">{num(ws("forms"))}</span></li>
            <li className="flex justify-between"><span className="text-muted">Conversión a contacto</span><span className="tabular-nums">{rate(ws("whatsappClicks") + ws("forms"), ws("sessions"))}</span></li>
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Contactos por fuente</h2>
          <div className="mt-4">
            <Bars rows={(Object.keys(SOURCE_LABELS) as (keyof typeof SOURCE_LABELS)[]).map((s) => ({ label: SOURCE_LABELS[s], value: leads.filter((l) => l.source === s).length, accent: SOCIAL_SOURCES.includes(s) }))} />
          </div>
          <p className="mt-3 text-xs text-muted">Instagram orgánico: {num(igDaily.reduce((s, d) => s + d.reach, 0))} de alcance y {num(igDaily.reduce((s, d) => s + d.messages, 0))} mensajes directos.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Alertas</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {alerts.map((a, i) => (
              <li key={i} className="flex gap-2">
                <Chip tone={a.tone}>{a.tone === "red" ? "Urgente" : "Revisar"}</Chip>
                {a.href ? <Link href={a.href} className="hover:underline">{a.text}</Link> : <span>{a.text}</span>}
              </li>
            ))}
            <li className="flex gap-2"><Chip tone="green">OK</Chip><span>Calidad del número de WhatsApp: alta{demo ? " (simulado)" : ""}.</span></li>
            {alerts.length === 0 && <li className="text-muted">Sin alertas en el período.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
