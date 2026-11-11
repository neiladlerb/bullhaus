import Link from "next/link";
import { daysUntil, formatDate, seesOnlyOwnProperties, STATUS_LABELS, PROPERTY_STATUSES } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";

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
