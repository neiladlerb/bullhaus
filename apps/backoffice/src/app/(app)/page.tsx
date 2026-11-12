import Link from "next/link";
import { can, daysUntil, formatDate, OPEN_STAGES, rate, seesOnlyOwnProperties, SOCIAL_SOURCES, STAGE_LABELS, STATUS_LABELS, PROPERTY_STATUSES } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Bars, Kpi } from "@/components/bars";
import { requireUser } from "@/lib/auth";
import { leadScope, since } from "@/lib/leads";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const own = seesOnlyOwnProperties(user.role);
  const where = { tenantId: user.tenantId, ...(own ? { brokerId: user.id } : {}) };

  const [byStatus, noPhotos, expiring] = await Promise.all([
    prisma.property.groupBy({ by: ["status"], where, _count: true }),
    prisma.property.count({ where: { ...where, status: "disponible", media: { none: {} } } }),
    prisma.mandate.findMany({
      where: { status: "vigente", property: where, expiresAt: { lte: new Date(Date.now() + 15 * 86_400_000) } },
      include: { property: { select: { id: true, code: true, comuna: true } }, owner: { select: { name: true } } },
      orderBy: { expiresAt: "asc" },
    }),
  ]);
  const showLeads = can(user.role, "leads.read");
  const ls = leadScope(user);
  const [leads30, social30, owners30, openByStage, pendingCampaigns] = showLeads
    ? await Promise.all([
        prisma.lead.count({ where: { ...ls, createdAt: { gte: since(30) } } }),
        prisma.lead.count({ where: { ...ls, createdAt: { gte: since(30) }, source: { in: [...SOCIAL_SOURCES] } } }),
        prisma.lead.count({ where: { ...ls, createdAt: { gte: since(30) }, kind: "propietario" } }),
        prisma.lead.groupBy({ by: ["stage"], where: { ...ls, kind: { not: "propietario" }, stage: { in: [...OPEN_STAGES] } }, _count: true }),
        prisma.campaign.count({ where: { tenantId: user.tenantId, status: "en_revision" } }),
      ])
    : [0, 0, 0, [], 0];
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;

  return (
    <div className="max-w-5xl">
      {sp["sin-permiso"] && (
        <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">No tienes permiso para esa sección.</p>
      )}
      <h1 className="text-2xl font-semibold">Hola, {user.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-muted">{own ? "Tus propiedades" : "Cartera de Bull Haus"} al {formatDate(new Date())}.</p>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PROPERTY_STATUSES.map((s) => (
          <Link key={s} href={`/propiedades?status=${s}`} className="card p-4 hover:border-ink">
            <p className="text-xs text-muted">{STATUS_LABELS[s]}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{count(s)}</p>
          </Link>
        ))}
      </section>

      {showLeads && (
        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-2 gap-3 lg:col-span-2">
            <Link href="/leads"><Kpi label="Leads últimos 30 días" value={leads30.toLocaleString("es-CL")} /></Link>
            <Link href="/leads?fuente=instagram"><Kpi label="Desde redes sociales" value={social30.toLocaleString("es-CL")} sub={`${rate(social30, leads30)} del total`} /></Link>
            <Link href="/pipeline?p=captacion"><Kpi label="Propietarios para captar" value={owners30.toLocaleString("es-CL")} sub="últimos 30 días" /></Link>
            <Link href="/campanas"><Kpi label="Campañas por aprobar" value={String(pendingCampaigns)} /></Link>
          </div>
          <Link href="/pipeline" className="card p-5 hover:border-ink">
            <h2 className="font-medium">Pipeline de demanda</h2>
            <div className="mt-4">
              <Bars rows={OPEN_STAGES.map((s) => ({ label: STAGE_LABELS.demanda[s], value: openByStage.find((b) => b.stage === s)?._count ?? 0, accent: s === "propuesta" }))} />
            </div>
          </Link>
        </section>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-medium">Mandatos por vencer (15 días)</h2>
          {expiring.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Ninguno.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {expiring.map((m) => {
                const d = daysUntil(m.expiresAt);
                return (
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <Link href={`/propiedades/${m.property.id}`} className="hover:underline">
                      {m.property.code} · {m.property.comuna} · {m.owner.name}
                    </Link>
                    <span className={`chip ${d < 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>
                      {d < 0 ? `Venció hace ${-d} d` : d === 0 ? "Vence hoy" : `Vence en ${d} d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Por completar</h2>
          <p className="mt-3 text-sm">
            {noPhotos === 0 ? (
              <span className="text-muted">Todas las propiedades disponibles tienen fotos.</span>
            ) : (
              <Link href="/propiedades?status=disponible" className="hover:underline">
                {noPhotos} propiedad{noPhotos === 1 ? "" : "es"} disponible{noPhotos === 1 ? "" : "s"} sin fotos
              </Link>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
