import Link from "next/link";
import { notFound } from "next/navigation";
import {
  can,
  CONTRACT_KIND_LABELS,
  CONTRACT_STATUS_LABELS,
  DEAL_PATH,
  dealBlocker,
  dealStageLabel,
  formatDate,
  formatPrice,
  formatRut,
  INVOICE_STATUS_LABELS,
  KYC_STATUS_LABELS,
  nextDealStage,
  PARTY_LABELS,
} from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Chip, DemoTag } from "@/components/demo";
import { CONTRACT_TONE, INVOICE_TONE, KYC_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { advanceDealAction, generateContractAction, sendKycLinkAction } from "../actions";
import { StateButton } from "../buttons";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("deals.read");
  const { id } = await params;
  const d = await prisma.deal.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      property: { select: { id: true, code: true, comuna: true, type: true } },
      lead: { select: { id: true, name: true, source: true } },
      parties: { include: { client: { include: { kycCases: { orderBy: { createdAt: "desc" }, take: 1 } } } } },
      contracts: { orderBy: { createdAt: "asc" } },
      invoices: { orderBy: { createdAt: "asc" }, include: { client: { select: { name: true } } } },
    },
  });
  if (!d) notFound();
  const broker = await prisma.user.findUnique({ where: { id: d.brokerId }, select: { name: true } });
  const next = nextDealStage(d.stage, d.operation);
  const parties = d.parties.map((p) => ({ name: p.client.name, kycStatus: p.client.kycCases[0]?.status ?? null }));
  const blocker = next ? dealBlocker(next, parties) : null;
  const path = d.stage === "caida" ? [...DEAL_PATH[d.operation], "caida" as const] : DEAL_PATH[d.operation];
  const writable = can(user.role, "deals.write");
  const docKind = d.operation === "venta" ? ("minuta_promesa" as const) : ("contrato_arriendo" as const);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/operaciones" className="text-sm text-muted hover:underline">← Operaciones</Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Operación {d.number} · {d.operation === "venta" ? "Venta" : "Arriendo"}
          {d.isDemo && <DemoTag />}
        </h1>
        <p className="mt-1 text-sm text-muted">
          <Link href={`/propiedades/${d.property.id}`} className="underline">{d.property.code}</Link> · {d.property.comuna} · {formatPrice(Number(d.price), d.currency)} · corredor {broker?.name}
          {d.lead && ` · lead ${d.lead.name}`}
        </p>
      </div>

      <section className="card p-5">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {path.map((s, i) => {
            const idx = path.indexOf(d.stage);
            const done = i < idx || d.stage === "cerrada";
            return (
              <li key={s} className="flex items-center gap-2">
                {i > 0 && <span className="text-line">→</span>}
                <span className={`chip ${s === d.stage ? "bg-ink text-white" : done ? "bg-green-100 text-green-800" : "bg-paper text-muted"}`}>{dealStageLabel(s, d.operation)}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-muted">
          Reserva el {formatDate(d.reservedAt)} · en {dealStageLabel(d.stage, d.operation).toLowerCase()} desde el {formatDate(d.stageChangedAt)}
          {d.lostReason && ` · ${d.lostReason}`}
        </p>
        {next && writable && d.stage !== "caida" && (
          <div className="mt-4 flex flex-wrap items-start gap-3">
            <StateButton action={advanceDealAction.bind(null, d.id)} label={`Pasar a ${dealStageLabel(next, d.operation)}`} />
            {blocker && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Bloqueado: {blocker}</p>}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-medium">Partes y KYC</h2>
        <p className="mt-1 text-xs text-muted">Los agentes y corredores solo envían el enlace al portal de verificación. Los documentos de identidad no pasan por el back office.</p>
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-line">
            {d.parties.map((p) => {
              const k = p.client.kycCases[0];
              return (
                <tr key={p.id}>
                  <td className="py-2">
                    <span className="font-medium">{p.client.name}</span>
                    <span className="block text-xs text-muted">{PARTY_LABELS[p.role]} · RUT {formatRut(p.client.rut)}</span>
                  </td>
                  <td>{k ? <Chip tone={KYC_TONE[k.status]!}>{KYC_STATUS_LABELS[k.status]}</Chip> : <Chip tone="gray">Sin KYC</Chip>}</td>
                  <td className="text-xs text-muted">{k?.riskLevel ? `Riesgo ${k.riskLevel}${k.pep ? " · PEP" : ""}` : ""}</td>
                  <td className="text-right">
                    {k && can(user.role, "kyc.read") && <Link href={`/kyc/${k.id}`} className="text-xs underline">Ver caso</Link>}
                    {writable && (!k || k.status === "pendiente" || k.status === "rechazado") && (
                      <form action={sendKycLinkAction.bind(null, d.id, p.clientId)} className="inline">
                        <button className="btn-ghost ml-2 py-1 text-xs">Enviar enlace de KYC</button>
                      </form>
                    )}
                    {k && (k.status === "enviado" || k.status === "pendiente") && d.isDemo && (
                      <Link href={`/verificacion/${k.token}`} target="_blank" className="ml-2 text-xs underline">Abrir portal (demo)</Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto font-medium">Documentos</h2>
          {can(user.role, "contracts.write") && d.stage !== "caida" && (
            <>
              <StateButton action={generateContractAction.bind(null, d.id, "carta_oferta")} label="Generar carta oferta" variant="btn-ghost" />
              <StateButton action={generateContractAction.bind(null, d.id, docKind)} label={`Generar ${CONTRACT_KIND_LABELS[docKind].toLowerCase()}`} variant="btn-ghost" />
            </>
          )}
        </div>
        <ul className="mt-3 divide-y divide-line text-sm">
          {d.contracts.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <Link href={`/contratos/${c.id}`} className="hover:underline">
                {CONTRACT_KIND_LABELS[c.kind]} N° {c.number}
              </Link>
              <span className="flex items-center gap-3 text-xs text-muted">
                {formatDate(c.createdAt)} <Chip tone={CONTRACT_TONE[c.status]!}>{CONTRACT_STATUS_LABELS[c.status]}</Chip>
              </span>
            </li>
          ))}
          {d.contracts.length === 0 && <li className="py-3 text-muted">Aún no hay documentos. Se generan cuando todas las partes tienen KYC aprobado.</li>}
        </ul>
      </section>

      {d.invoices.length > 0 && (
        <section className="card p-5">
          <h2 className="font-medium">Facturación de la comisión</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {d.invoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {i.kind === "nota_credito" ? "Nota de crédito" : "Factura"} {i.folio ? `folio ${i.folio}` : "(borrador)"} · {i.client.name}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{formatPrice(i.totalClp, "CLP")}</span>
                  <Chip tone={INVOICE_TONE[i.status]!}>{INVOICE_STATUS_LABELS[i.status]}</Chip>
                </span>
              </li>
            ))}
          </ul>
          {can(user.role, "billing.read") && <Link href="/facturacion" className="mt-3 inline-block text-xs underline">Ir a Facturación</Link>}
        </section>
      )}
    </div>
  );
}
