import Link from "next/link";
import { BROCHURE_KIND_LABELS, BROCHURE_STATUS_LABELS, can, formatDate, rate, seesOnlyOwnProperties, TYPE_LABELS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Kpi } from "@/components/bars";
import { Chip, DemoTag } from "@/components/demo";
import { BROCHURE_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { createBrochureAction } from "./actions";

const ERRORS: Record<string, string> = { propiedad: "Elige una propiedad disponible que coincida con el tipo de brochure (venta o arriendo)." };

export default async function BrochuresPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("leads.read");
  const sp = await searchParams;
  const own = seesOnlyOwnProperties(user.role);
  const write = can(user.role, "leads.write") || can(user.role, "campaigns.write");
  const scope = { tenantId: user.tenantId, ...(own ? { OR: [{ createdById: user.id }, { property: { brokerId: user.id } }] } : {}) };

  const [brochures, properties] = await Promise.all([
    prisma.brochure.findMany({
      where: scope,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: { property: { select: { code: true, type: true, comuna: true } }, _count: { select: { shares: true, leads: true } }, shares: { select: { openedAt: true } } },
    }),
    write
      ? prisma.property.findMany({ where: { tenantId: user.tenantId, status: "disponible", ...(own ? { brokerId: user.id } : {}) }, orderBy: { code: "asc" }, select: { id: true, code: true, operation: true, type: true, comuna: true } })
      : [],
  ]);
  const shares = brochures.reduce((a, b) => a + b._count.shares, 0);
  const opened = brochures.reduce((a, b) => a + b.shares.filter((s) => s.openedAt).length, 0);
  const leads = brochures.reduce((a, b) => a + b._count.leads, 0);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brochures</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Brochures de captación de propietarios y de venta o arriendo de cada propiedad, para enviar por WhatsApp, email y redes. Se arman con la ficha aprobada (nunca con la dirección exacta) y solo se comparten cuando administración los aprueba. Cada envío mide aperturas y los contactos que dejan sus datos entran al pipeline con un compromiso de llamada.
        </p>
      </div>
      {sp.error && ERRORS[sp.error] && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{ERRORS[sp.error]}</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Brochures aprobados" value={String(brochures.filter((b) => b.status === "aprobado").length)} sub={`${brochures.filter((b) => b.status === "en_revision").length} en revisión`} />
        <Kpi label="Envíos" value={shares.toLocaleString("es-CL")} />
        <Kpi label="Abiertos" value={opened.toLocaleString("es-CL")} sub={`${rate(opened, shares)} de los envíos`} />
        <Kpi label="Leads generados" value={leads.toLocaleString("es-CL")} sub={`${rate(leads, opened)} de los abiertos`} />
      </section>

      {write && (
        <section className="card p-5">
          <h2 className="font-medium">Nuevo brochure</h2>
          <form action={createBrochureAction} className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_1fr_auto] md:items-end">
            <label>
              <span className="label">Tipo</span>
              <select name="kind" className="input" defaultValue="venta">
                {(["venta", "arriendo", "captacion"] as const).map((k) => (
                  <option key={k} value={k}>{BROCHURE_KIND_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Propiedad (venta o arriendo)</span>
              <select name="propertyId" className="input" defaultValue="">
                <option value="">Ninguna (captación)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {TYPE_LABELS[p.type]} en {p.operation} · {p.comuna}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Título (opcional; por defecto, el de la ficha)</span>
              <input name="title" className="input" maxLength={120} />
            </label>
            <button className="btn-primary">Crear borrador</button>
          </form>
        </section>
      )}

      <section className="card overflow-x-auto p-5">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-2 font-semibold">Brochure</th>
              <th className="font-semibold">Tipo</th>
              <th className="font-semibold">Estado</th>
              <th className="font-semibold">Envíos</th>
              <th className="font-semibold">Abiertos</th>
              <th className="font-semibold">Visitas al brochure</th>
              <th className="font-semibold">Leads</th>
              <th className="font-semibold">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {brochures.map((b) => (
              <tr key={b.id}>
                <td className="py-2">
                  <Link href={`/brochures/${b.id}`} className="font-medium hover:underline">{b.title}</Link>
                  {b.isDemo && <DemoTag />}
                  {b.property && <span className="block text-xs text-muted">{b.property.code} · {TYPE_LABELS[b.property.type]} · {b.property.comuna}</span>}
                </td>
                <td>{BROCHURE_KIND_LABELS[b.kind]}</td>
                <td><Chip tone={BROCHURE_TONE[b.status]}>{BROCHURE_STATUS_LABELS[b.status]}</Chip></td>
                <td className="tabular-nums">{b._count.shares}</td>
                <td className="tabular-nums">{b.shares.filter((s) => s.openedAt).length}</td>
                <td className="tabular-nums">{b.views}</td>
                <td className="tabular-nums">{b._count.leads}</td>
                <td className="text-muted">{formatDate(b.updatedAt)}</td>
              </tr>
            ))}
            {brochures.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-muted">Todavía no hay brochures.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
