import Link from "next/link";
import { can, formatDate, formatPrice, INVOICE_STATUS_LABELS } from "@bullhaus/core";
import { prisma, type InvoiceStatus } from "@bullhaus/db";
import { Bars, Kpi } from "@/components/bars";
import { Chip, DemoTag, SimulatedNote } from "@/components/demo";
import { INVOICE_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { approveInvoiceAction, emitInvoiceAction, markPaidAction } from "./actions";

const STATUSES = Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[];
const clp = (n: number) => formatPrice(n, "CLP");
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default async function FacturacionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("billing.read");
  const sp = await searchParams;
  const finance = can(user.role, "billing.approve");
  const status = STATUSES.includes(sp.estado as InvoiceStatus) ? (sp.estado as InvoiceStatus) : undefined;
  const [list, all, users] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId: user.tenantId, ...(status ? { status } : {}) },
      orderBy: [{ createdAt: "desc" }],
      take: 120,
      include: { client: { select: { name: true } }, deal: { select: { id: true, number: true, brokerId: true } } },
    }),
    prisma.invoice.findMany({ where: { tenantId: user.tenantId }, select: { kind: true, status: true, netClp: true, totalClp: true, issuedAt: true, paidAt: true, dueAt: true, deal: { select: { brokerId: true } } } }),
    prisma.user.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ]);
  const sign = (k: string) => (k === "nota_credito" ? -1 : 1);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const issued = all.filter((i) => i.issuedAt && ["emitida", "pagada", "vencida"].includes(i.status));
  const billedMonth = issued.filter((i) => i.issuedAt! >= monthStart).reduce((a, i) => a + sign(i.kind) * i.netClp, 0);
  const billedYear = issued.filter((i) => i.issuedAt! >= new Date(now.getTime() - 365 * 86_400_000)).reduce((a, i) => a + sign(i.kind) * i.netClp, 0);
  const receivable = all.filter((i) => i.kind === "factura" && (i.status === "emitida" || i.status === "vencida")).reduce((a, i) => a + i.totalClp, 0);
  const overdue = all.filter((i) => i.status === "vencida").reduce((a, i) => a + i.totalClp, 0);
  const toApprove = all.filter((i) => i.status === "borrador").length;

  const months = Array.from({ length: 12 }, (_, k) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + k, 1));
    const e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    return { label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, value: issued.filter((i) => i.issuedAt! >= d && i.issuedAt! < e).reduce((a, i) => a + sign(i.kind) * i.netClp, 0) };
  });
  // Liquidación de comisiones por corredor: facturas pagadas en los últimos 90 días (reparto de demostración: 40 % al corredor).
  const paid90 = all.filter((i) => i.status === "pagada" && i.paidAt && i.paidAt >= new Date(now.getTime() - 90 * 86_400_000) && i.deal);
  const byBroker = new Map<string, number>();
  for (const i of paid90) byBroker.set(i.deal!.brokerId, (byBroker.get(i.deal!.brokerId) ?? 0) + sign(i.kind) * i.netClp);
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "—";

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Facturación</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">Comisiones de corretaje a cada parte. El borrador se arma solo al llegar a escritura o entrega; Finanzas lo aprueba y se emite por el proveedor de facturación electrónica, nunca directo al SII.</p>
        </div>
        <a href="/facturacion/exportar" className="btn-ghost">Exportar a contabilidad (CSV)</a>
      </div>
      {all.length > 0 && list.some((i) => i.provider === "simulado") && <SimulatedNote what="Las facturas y folios son ficticios; nada se envió al SII." integration="el proveedor de facturación electrónica" />}
      {!finance && toApprove > 0 && <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{toApprove} borrador(es) esperan la aprobación de Finanzas. Solo ese rol puede aprobar y emitir.</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Facturado este mes (neto)" value={clp(billedMonth)} />
        <Kpi label="Últimos 12 meses (neto)" value={clp(billedYear)} />
        <Kpi label="Por cobrar" value={clp(receivable)} sub="emitidas y vencidas, con IVA" />
        <Kpi label="Vencido" value={clp(overdue)} />
        <Kpi label="Borradores por aprobar" value={String(toApprove)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-medium">Comisión facturada por mes (neto)</h2>
          <div className="mt-4">
            <Bars rows={months.map((m, i) => ({ label: m.label, value: Math.max(0, m.value), accent: i === months.length - 1 }))} format={(n) => clp(n)} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Liquidación por corredor</h2>
          <p className="mt-1 text-xs text-muted">Comisión cobrada en 90 días y 40 % para el corredor (reparto de demostración; el real lo define Bull Haus).</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {[...byBroker.entries()].sort((a, b) => b[1] - a[1]).map(([id, total]) => (
              <li key={id} className="flex justify-between gap-2 py-2">
                <span className="truncate">{name(id)}</span>
                <span className="text-right tabular-nums">{clp(total * 0.4)}<span className="block text-[11px] text-muted">de {clp(total)}</span></span>
              </li>
            ))}
            {byBroker.size === 0 && <li className="py-2 text-muted">Sin comisiones cobradas.</li>}
          </ul>
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <Link href="/facturacion" className={`chip ${!status ? "bg-ink text-white" : "bg-white"}`}>Todas</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/facturacion?estado=${s}`} className={`chip ${status === s ? "bg-ink text-white" : "bg-white"}`}>{INVOICE_STATUS_LABELS[s]}</Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Folio</th>
              <th className="font-semibold">Cliente y concepto</th>
              <th className="font-semibold">Neto</th>
              <th className="font-semibold">Total</th>
              <th className="font-semibold">Emisión</th>
              <th className="font-semibold">Vence</th>
              <th className="font-semibold">Estado</th>
              <th className="pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((i) => (
              <tr key={i.id} className="align-top">
                <td className="px-4 py-2.5 tabular-nums">
                  {i.folio ?? "—"}
                  {i.isDemo && <DemoTag />}
                  {i.kind === "nota_credito" && <span className="block text-[11px] text-muted">Nota de crédito</span>}
                </td>
                <td className="py-2.5">
                  {i.client.name}
                  <span className="block max-w-md text-xs text-muted">
                    {i.concept}
                    {i.amountUf && ` · UF ${Number(i.amountUf).toLocaleString("es-CL")} a $${Number(i.ufValue).toLocaleString("es-CL")}`}
                  </span>
                  {i.deal && <Link href={`/operaciones/${i.deal.id}`} className="text-xs underline">Operación {i.deal.number}</Link>}
                </td>
                <td className="py-2.5 tabular-nums">{clp(sign(i.kind) * i.netClp)}</td>
                <td className="py-2.5 tabular-nums">{clp(sign(i.kind) * i.totalClp)}</td>
                <td className="py-2.5 tabular-nums text-muted">{i.issuedAt ? formatDate(i.issuedAt) : "—"}</td>
                <td className="py-2.5 tabular-nums text-muted">{i.dueAt ? formatDate(i.dueAt) : "—"}</td>
                <td className="py-2.5"><Chip tone={INVOICE_TONE[i.status]!}>{INVOICE_STATUS_LABELS[i.status]}</Chip></td>
                <td className="py-2.5 pr-4 text-right">
                  {finance && i.status === "borrador" && <form action={approveInvoiceAction.bind(null, i.id)}><button className="btn-ghost py-1 text-xs">Aprobar</button></form>}
                  {finance && i.status === "aprobada" && <form action={emitInvoiceAction.bind(null, i.id)}><button className="btn-brand py-1 text-xs">Emitir</button></form>}
                  {finance && (i.status === "emitida" || i.status === "vencida") && i.kind === "factura" && <form action={markPaidAction.bind(null, i.id)}><button className="btn-ghost py-1 text-xs">Marcar pagada</button></form>}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">Sin facturas en esta vista.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
