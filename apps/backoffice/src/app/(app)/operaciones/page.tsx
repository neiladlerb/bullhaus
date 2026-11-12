import Link from "next/link";
import { dealStageLabel, DEAL_STAGES, formatDate, formatPrice, seesOnlyOwnProperties, type DealStage } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import { Kpi } from "@/components/bars";
import { Chip, DemoTag, SimulatedNote } from "@/components/demo";
import { STAGE_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";

export default async function OperacionesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("deals.read");
  const sp = await searchParams;
  const where: Prisma.DealWhereInput = { tenantId: user.tenantId, ...(seesOnlyOwnProperties(user.role) ? { brokerId: user.id } : {}) };
  if (sp.etapa && (DEAL_STAGES as readonly string[]).includes(sp.etapa)) where.stage = sp.etapa as DealStage;
  else if (!sp.todas) where.stage = { notIn: ["cerrada", "caida"] };
  const [deals, counts, brokers] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { stageChangedAt: "desc" },
      take: 120,
      include: { property: { select: { code: true, comuna: true } }, parties: { include: { client: { select: { name: true, kycCases: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } } } } },
    }),
    prisma.deal.groupBy({ by: ["stage"], where: { tenantId: user.tenantId }, _count: true }),
    prisma.user.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ]);
  const n = (s: DealStage) => counts.find((c) => c.stage === s)?._count ?? 0;
  const brokerName = (id: string) => brokers.find((b) => b.id === id)?.name ?? "—";
  const demo = deals.some((d) => d.isDemo);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Operaciones</h1>
        <p className="mt-1 text-sm text-muted">Desde la reserva hasta el cierre. Ninguna operación pasa a Promesa o Contrato sin KYC aprobado de todas las partes.</p>
      </div>
      {demo && <SimulatedNote what="Las operaciones, partes y montos son ficticios, armados sobre la cartera real." integration="KYC, firma electrónica y facturación" />}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="En reserva" value={String(n("reserva"))} />
        <Kpi label="Promesa o contrato" value={String(n("promesa") + n("contrato"))} />
        <Kpi label="Escritura o entrega" value={String(n("escritura"))} />
        <Kpi label="Cerradas" value={String(n("cerrada"))} sub="últimos 12 meses" />
        <Kpi label="Caídas" value={String(n("caida"))} />
      </section>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <Link href="/operaciones" className={`chip ${!sp.etapa && !sp.todas ? "bg-ink text-white" : "bg-white"}`}>En curso</Link>
        {DEAL_STAGES.map((s) => (
          <Link key={s} href={`/operaciones?etapa=${s}`} className={`chip ${sp.etapa === s ? "bg-ink text-white" : "bg-white"}`}>{s === "escritura" ? "Escritura / Entrega" : dealStageLabel(s, "venta")}</Link>
        ))}
        <Link href="/operaciones?todas=1" className={`chip ${sp.todas ? "bg-ink text-white" : "bg-white"}`}>Todas</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">N°</th>
              <th className="font-semibold">Propiedad</th>
              <th className="font-semibold">Partes y KYC</th>
              <th className="font-semibold">Precio</th>
              <th className="font-semibold">Etapa</th>
              <th className="font-semibold">Desde</th>
              <th className="pr-4 font-semibold">Corredor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deals.map((d) => (
              <tr key={d.id} className="align-top hover:bg-paper/50">
                <td className="px-4 py-3">
                  <Link href={`/operaciones/${d.id}`} className="font-medium hover:underline">{d.number}</Link>
                  {d.isDemo && <DemoTag />}
                </td>
                <td className="py-3">
                  {d.property.code} · {d.operation === "venta" ? "Venta" : "Arriendo"}
                  <span className="block text-xs text-muted">{d.property.comuna}</span>
                </td>
                <td className="py-3">
                  {d.parties.map((p) => {
                    const st = p.client.kycCases[0]?.status;
                    return (
                      <span key={p.id} className="block text-xs">
                        <span className={st === "aprobado" ? "text-green-700" : st === "rechazado" ? "text-red-700" : "text-amber-700"}>●</span> {p.client.name}
                      </span>
                    );
                  })}
                </td>
                <td className="py-3 tabular-nums">{formatPrice(Number(d.price), d.currency)}</td>
                <td className="py-3"><Chip tone={STAGE_TONE[d.stage]!}>{dealStageLabel(d.stage, d.operation)}</Chip></td>
                <td className="py-3 tabular-nums text-muted">{formatDate(d.stageChangedAt)}</td>
                <td className="py-3 pr-4">{brokerName(d.brokerId)}</td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">Sin operaciones en esta vista.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
