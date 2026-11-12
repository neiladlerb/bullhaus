import Link from "next/link";
import { formatDate, KYC_STATUS_LABELS } from "@bullhaus/core";
import { prisma, type KycStatus } from "@bullhaus/db";
import { Kpi } from "@/components/bars";
import { Chip, DemoTag, SimulatedNote } from "@/components/demo";
import { KYC_TONE, RISK_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";

const STATUSES = Object.keys(KYC_STATUS_LABELS) as KycStatus[];

export default async function KycPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("kyc.read");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.estado as KycStatus) ? (sp.estado as KycStatus) : undefined;
  const [cases, counts, highRisk, pep] = await Promise.all([
    prisma.kycCase.findMany({
      where: { tenantId: user.tenantId, ...(status ? { status } : sp.todos ? {} : { status: { in: ["enviado", "en_revision", "pendiente", "rechazado"] } }) },
      orderBy: { createdAt: "desc" },
      take: 150,
      include: { client: { select: { name: true, kind: true } }, deal: { select: { id: true, number: true } } },
    }),
    prisma.kycCase.groupBy({ by: ["status"], where: { tenantId: user.tenantId }, _count: true }),
    prisma.kycCase.count({ where: { tenantId: user.tenantId, riskLevel: "alto" } }),
    prisma.kycCase.count({ where: { tenantId: user.tenantId, pep: true } }),
  ]);
  const n = (s: KycStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">KYC · debida diligencia</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Verificación de identidad, listas, PEP y origen de fondos de cada parte (Ley 19.913 y Circular 62 de la UAF). Solo Cumplimiento aprueba o rechaza. Los documentos y la biometría quedan en el proveedor: nunca en el back office, en logs ni en un modelo de IA.
        </p>
      </div>
      {cases.some((c) => c.isDemo) && <SimulatedNote what="Las personas y resultados son ficticios; no se subió ningún documento." integration="el proveedor de verificación de identidad" />}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Por revisar" value={String(n("en_revision"))} sub="esperan a Cumplimiento" />
        <Kpi label="Enlace enviado" value={String(n("enviado") + n("pendiente"))} sub="la persona aún no completa" />
        <Kpi label="Aprobados" value={String(n("aprobado"))} />
        <Kpi label="Rechazados" value={String(n("rechazado"))} />
        <Kpi label="Riesgo alto / PEP" value={`${highRisk} / ${pep}`} sub="debida diligencia reforzada" />
      </section>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <Link href="/kyc" className={`chip ${!status && !sp.todos ? "bg-ink text-white" : "bg-white"}`}>Abiertos</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/kyc?estado=${s}`} className={`chip ${status === s ? "bg-ink text-white" : "bg-white"}`}>{KYC_STATUS_LABELS[s]}</Link>
        ))}
        <Link href="/kyc?todos=1" className={`chip ${sp.todos ? "bg-ink text-white" : "bg-white"}`}>Todos</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Persona</th>
              <th className="font-semibold">Operación</th>
              <th className="font-semibold">Estado</th>
              <th className="font-semibold">Riesgo</th>
              <th className="font-semibold">Enviado</th>
              <th className="pr-4 font-semibold">Revisado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cases.map((k) => (
              <tr key={k.id} className="hover:bg-paper/50">
                <td className="px-4 py-2.5">
                  <Link href={`/kyc/${k.id}`} className="font-medium hover:underline">{k.client.name}</Link>
                  {k.isDemo && <DemoTag />}
                </td>
                <td>{k.deal ? <Link href={`/operaciones/${k.deal.id}`} className="hover:underline">{k.deal.number}</Link> : <span className="text-muted">Mandato</span>}</td>
                <td><Chip tone={KYC_TONE[k.status]!}>{KYC_STATUS_LABELS[k.status]}</Chip></td>
                <td>{k.riskLevel ? <Chip tone={RISK_TONE[k.riskLevel]!}>{k.riskLevel}{k.pep ? " · PEP" : ""}</Chip> : "—"}</td>
                <td className="tabular-nums text-muted">{k.sentAt ? formatDate(k.sentAt) : "—"}</td>
                <td className="pr-4 tabular-nums text-muted">{k.reviewedAt ? formatDate(k.reviewedAt) : "—"}</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">Sin casos en esta vista.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
