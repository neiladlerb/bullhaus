import Link from "next/link";
import { notFound } from "next/navigation";
import { can, CONTRACT_KIND_LABELS, CONTRACT_STATUS_LABELS, formatDate } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { ContractDoc } from "@/components/contract-doc";
import { Chip, DemoTag } from "@/components/demo";
import { CONTRACT_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { markSignedAction, sendToSignatureAction } from "../actions";
import { PrintButton } from "../print-button";

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("contracts.read");
  const { id } = await params;
  const c = await prisma.contract.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { property: { select: { id: true, code: true, brokerId: true } }, deal: { select: { id: true, number: true } }, template: { select: { version: true, approvedByLawyer: true } } },
  });
  if (!c) notFound();
  const writable = can(user.role, "contracts.write");

  return (
    <div className="max-w-4xl space-y-5">
      <div className="print:hidden">
        <Link href="/contratos" className="text-sm text-muted hover:underline">← Contratos</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-2xl font-semibold">
            {CONTRACT_KIND_LABELS[c.kind]} N° {c.number}
            {c.isDemo && <DemoTag />}
          </h1>
          <Chip tone={CONTRACT_TONE[c.status]!}>{CONTRACT_STATUS_LABELS[c.status]}</Chip>
          {writable && c.status === "borrador" && (
            <form action={sendToSignatureAction.bind(null, c.id)}>
              <button className="btn-brand">Enviar a firma</button>
            </form>
          )}
          {writable && c.status === "enviado" && c.isDemo && (
            <form action={markSignedAction.bind(null, c.id)}>
              <button className="btn-ghost">Simular firma de las partes</button>
            </form>
          )}
          <PrintButton />
        </div>
        <p className="mt-1 text-sm text-muted">
          <Link href={`/propiedades/${c.property.id}`} className="underline">{c.property.code}</Link>
          {c.deal && (
            <>
              {" · "}
              <Link href={`/operaciones/${c.deal.id}`} className="underline">operación {c.deal.number}</Link>
            </>
          )}
          {" · "}generado el {formatDate(c.createdAt)} con la plantilla {c.template.version}
          {c.signedAt && ` · firmado el ${formatDate(c.signedAt)}`}
        </p>
        <p className="mt-2 text-xs text-muted">Copia congelada: un cambio posterior en la ficha o en el KYC no altera este documento.</p>
      </div>

      <article className="card relative overflow-hidden bg-white p-8 sm:p-12 print:border-0 print:p-0">
        {c.isDemo && (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-30 select-none whitespace-nowrap text-6xl font-black uppercase tracking-widest text-violet-500/10">Demostración · sin validez</span>
          </div>
        )}
        <div className="relative">
          <ContractDoc body={c.body} />
        </div>
      </article>
    </div>
  );
}
