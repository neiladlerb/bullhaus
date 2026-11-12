import Link from "next/link";
import { CONTRACT_KIND_LABELS, CONTRACT_STATUS_LABELS, formatDate, seesOnlyOwnProperties, type ContractKind } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import { Kpi } from "@/components/bars";
import { Chip, DemoTag, SimulatedNote } from "@/components/demo";
import { CONTRACT_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";

const KINDS = Object.keys(CONTRACT_KIND_LABELS) as ContractKind[];

export default async function ContratosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("contracts.read");
  const sp = await searchParams;
  const base: Prisma.ContractWhereInput = { tenantId: user.tenantId, ...(seesOnlyOwnProperties(user.role) ? { property: { brokerId: user.id } } : {}) };
  const where: Prisma.ContractWhereInput = { ...base };
  if (KINDS.includes(sp.tipo as ContractKind)) where.kind = sp.tipo as ContractKind;
  if (sp.q) where.property = { ...(where.property as object), code: { contains: sp.q } };
  const [contracts, byKind, templates] = await Promise.all([
    prisma.contract.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { property: { select: { code: true, comuna: true } }, deal: { select: { number: true } } } }),
    prisma.contract.groupBy({ by: ["kind"], where: base, _count: true }),
    prisma.contractTemplate.findMany({ where: { tenantId: user.tenantId }, orderBy: { kind: "asc" } }),
  ]);
  const n = (k: ContractKind) => byKind.find((b) => b.kind === k)?._count ?? 0;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contratos</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Órdenes de corretaje de cada propiedad de la cartera, cartas oferta, contratos de arriendo y minutas de promesa. Se generan desde plantillas aprobadas por el abogado, con los datos del KYC aprobado y de los certificados de la propiedad, nunca de la ficha comercial.
        </p>
      </div>
      {contracts.some((c) => c.isDemo) && <SimulatedNote what="Los contratos usan propietarios, roles y fojas ficticios y las plantillas aún sin revisión del abogado; llevan marca de agua." integration="la firma electrónica" />}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KINDS.map((k) => (
          <Link key={k} href={`/contratos?tipo=${k}`}>
            <Kpi label={CONTRACT_KIND_LABELS[k]} value={String(n(k))} />
          </Link>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Link href="/contratos" className={`chip ${!sp.tipo ? "bg-ink text-white" : "bg-white"}`}>Todos</Link>
          {KINDS.map((k) => (
            <Link key={k} href={`/contratos?tipo=${k}`} className={`chip ${sp.tipo === k ? "bg-ink text-white" : "bg-white"}`}>{CONTRACT_KIND_LABELS[k]}</Link>
          ))}
        </div>
        <form action="/contratos" className="ml-auto">
          {sp.tipo && <input type="hidden" name="tipo" value={sp.tipo} />}
          <input name="q" defaultValue={sp.q} placeholder="Código de propiedad" className="input w-48" />
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">N°</th>
              <th className="font-semibold">Documento</th>
              <th className="font-semibold">Propiedad</th>
              <th className="font-semibold">Operación</th>
              <th className="font-semibold">Fecha</th>
              <th className="pr-4 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {contracts.map((c) => (
              <tr key={c.id} className="hover:bg-paper/50">
                <td className="px-4 py-2.5">
                  <Link href={`/contratos/${c.id}`} className="font-medium hover:underline">{c.number}</Link>
                  {c.isDemo && <DemoTag />}
                </td>
                <td>{CONTRACT_KIND_LABELS[c.kind]}</td>
                <td>{c.property.code} <span className="text-xs text-muted">· {c.property.comuna}</span></td>
                <td className="text-muted">{c.deal?.number ?? "—"}</td>
                <td className="tabular-nums text-muted">{formatDate(c.createdAt)}</td>
                <td className="pr-4"><Chip tone={CONTRACT_TONE[c.status]!}>{CONTRACT_STATUS_LABELS[c.status]}</Chip></td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">Sin contratos. Se generan desde cada mandato y operación.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="card p-5">
        <h2 className="font-medium">Plantillas</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {templates.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {CONTRACT_KIND_LABELS[t.kind]} · versión {t.version}
                {t.isDemo && <DemoTag />}
              </span>
              {t.isDemo ? <Chip tone="amber">Sin revisión de abogado: solo para la demo</Chip> : t.approvedByLawyer ? <Chip tone="green">Aprobada por {t.approvedByLawyer}</Chip> : <Chip tone="red">Sin aprobar</Chip>}
            </li>
          ))}
          {templates.length === 0 && <li className="py-2 text-muted">No hay plantillas aprobadas. Sin plantilla aprobada por el abogado no se genera ningún contrato.</li>}
        </ul>
      </section>
    </div>
  );
}
