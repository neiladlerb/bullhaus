import Link from "next/link";
import { notFound } from "next/navigation";
import { can, formatDate, formatRut, KYC_STATUS_LABELS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Chip, DemoTag } from "@/components/demo";
import { KYC_TONE, RISK_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { reviewKycAction } from "../actions";

const yesNo = (v: boolean | null, yes = "Sí", no = "No") => (v === null ? "—" : v ? yes : no);

export default async function KycCasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("kyc.read");
  const { id } = await params;
  const k = await prisma.kycCase.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { client: true, deal: { select: { id: true, number: true, operation: true } }, accessLog: { orderBy: { createdAt: "desc" }, take: 12 } },
  });
  if (!k) notFound();
  // Cada acceso a un caso de KYC queda registrado (CLAUDE.md).
  await prisma.kycAccessLog.create({ data: { caseId: k.id, userId: user.id, action: "ver" } });
  const reviewer = can(user.role, "kyc.review");
  const people = await prisma.user.findMany({ where: { id: { in: [...new Set([...k.accessLog.map((a) => a.userId), k.reviewerId ?? ""])] } }, select: { id: true, name: true } });
  const who = (uid: string | null) => people.find((p) => p.id === uid)?.name ?? "—";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/kyc" className="text-sm text-muted hover:underline">← KYC</Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {k.client.name}
          {k.isDemo && <DemoTag />}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          RUT {formatRut(k.client.rut)} · {k.client.kind === "natural" ? "Persona natural" : "Persona jurídica"}
          {k.deal && (
            <>
              · <Link href={`/operaciones/${k.deal.id}`} className="underline">operación {k.deal.number}</Link>
            </>
          )}
          <Chip tone={KYC_TONE[k.status]!}>{KYC_STATUS_LABELS[k.status]}</Chip>
          {k.riskLevel && <Chip tone={RISK_TONE[k.riskLevel]!}>Riesgo {k.riskLevel} ({k.riskScore}/100)</Chip>}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5 text-sm">
          <h2 className="font-medium">Verificación del proveedor</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between"><dt className="text-muted">Proveedor</dt><dd>{k.provider === "simulado" ? "Simulado (demo)" : k.provider}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Referencia</dt><dd className="font-mono text-xs">{k.providerRef ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Carnet auténtico y vigente</dt><dd>{yesNo(k.identityVerified)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Prueba de vida</dt><dd>{yesNo(k.livenessPassed, "Superada", "No superada")}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Listas ONU, PEP y UAF</dt><dd>{yesNo(k.listsClear, "Sin coincidencias", "Con coincidencias")}</dd></div>
          </dl>
          <p className="mt-4 rounded-md bg-paper px-3 py-2 text-xs text-muted">
            Las imágenes del carnet y la biometría {reviewer ? "se abren solo en el panel del proveedor, con acceso de Cumplimiento" : "solo las ve Cumplimiento, en el panel del proveedor"}. No se guardan aquí.
          </p>
        </div>
        <div className="card p-5 text-sm">
          <h2 className="font-medium">Declaraciones</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between gap-4"><dt className="text-muted">Persona expuesta políticamente</dt><dd className="text-right">{k.pep === null ? "—" : k.pep ? `Sí · ${k.pepRole}` : "No"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Origen de los fondos</dt><dd className="text-right">{k.fundsOrigin ?? "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Nacionalidad</dt><dd>{k.client.nationality ?? "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Profesión</dt><dd>{k.client.profession ?? "—"}</dd></div>
          </dl>
          <h2 className="mt-5 font-medium">Plazos</h2>
          <dl className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between"><dt className="text-muted">Enlace enviado</dt><dd>{k.sentAt ? formatDate(k.sentAt) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Completado por la persona</dt><dd>{k.submittedAt ? formatDate(k.submittedAt) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Revisado</dt><dd>{k.reviewedAt ? `${formatDate(k.reviewedAt)} por ${who(k.reviewerId)}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Vence</dt><dd>{k.expiresAt ? formatDate(k.expiresAt) : "—"}</dd></div>
          </dl>
        </div>
      </section>

      {k.reviewNote && <p className="card p-4 text-sm"><span className="text-muted">Nota de Cumplimiento:</span> {k.reviewNote}</p>}

      {k.status === "en_revision" &&
        (reviewer ? (
          <form className="card space-y-3 p-5">
            <h2 className="font-medium">Decisión de Cumplimiento</h2>
            <textarea name="note" rows={3} className="input" placeholder={k.riskLevel === "alto" ? "Riesgo alto: describe la debida diligencia reforzada (obligatorio para aprobar)" : "Nota (opcional)"} />
            <div className="flex gap-2">
              <button formAction={reviewKycAction.bind(null, k.id, "aprobado")} className="btn-primary">Aprobar</button>
              <button formAction={reviewKycAction.bind(null, k.id, "rechazado")} className="btn-ghost text-red-700">Rechazar</button>
            </div>
          </form>
        ) : (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Este caso espera la revisión de Cumplimiento. Solo una persona con ese rol puede aprobarlo o rechazarlo{k.isDemo ? " (en la demo: Paula Ríos)" : ""}.
          </p>
        ))}

      <section className="card p-5 text-sm">
        <h2 className="font-medium">Registro de accesos</h2>
        <ul className="mt-2 divide-y divide-line text-xs">
          <li className="flex justify-between py-1.5"><span>{user.name} · ver</span><span className="text-muted">ahora</span></li>
          {k.accessLog.map((a) => (
            <li key={a.id} className="flex justify-between py-1.5">
              <span>{who(a.userId)} · {a.action}</span>
              <span className="text-muted">{formatDate(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
