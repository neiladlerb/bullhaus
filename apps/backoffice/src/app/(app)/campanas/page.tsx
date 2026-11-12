import Link from "next/link";
import { CAMPAIGN_STATUS_LABELS, formatDate, formatPrice, OBJECTIVE_LABELS, rate } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { STATUS_CHIP } from "@/components/campaign-status";
import { requireUser } from "@/lib/auth";

export default async function CampanasPage() {
  const user = await requireUser("campaigns.read");
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: user.tenantId },
    orderBy: [{ createdAt: "desc" }],
    include: { _count: { select: { posts: true, leads: true } } },
  });
  const pending = campaigns.filter((c) => c.status === "en_revision");

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campañas de Instagram</h1>
        <p className="mt-1 text-sm text-muted">Captación de propietarios, venta y arriendo. Ninguna campaña se publica ni gasta presupuesto sin la aprobación de una persona de Bull Haus.</p>
      </div>

      {pending.length > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pending.length} campaña{pending.length === 1 ? "" : "s"} esperando aprobación.
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Campaña</th>
              <th className="font-semibold">Objetivo</th>
              <th className="font-semibold">Estado</th>
              <th className="font-semibold">Fechas</th>
              <th className="font-semibold">Presupuesto</th>
              <th className="font-semibold">Piezas</th>
              <th className="font-semibold">Leads</th>
              <th className="pr-4 font-semibold">CTR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-paper/50">
                <td className="px-4 py-3">
                  <Link href={`/campanas/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  {c.isDemo && <span className="chip ml-1.5 bg-paper text-[10px] text-muted">demo</span>}
                </td>
                <td>{OBJECTIVE_LABELS[c.objective]}</td>
                <td>
                  <span className={`chip ${STATUS_CHIP[c.status]}`}>{CAMPAIGN_STATUS_LABELS[c.status]}</span>
                </td>
                <td className="tabular-nums text-muted">{c.startsAt && c.endsAt ? `${formatDate(c.startsAt)} – ${formatDate(c.endsAt)}` : "—"}</td>
                <td className="tabular-nums">{c.budgetClp ? formatPrice(c.budgetClp, "CLP") : "—"}</td>
                <td className="tabular-nums">{c._count.posts}</td>
                <td className="tabular-nums">{c._count.leads}</td>
                <td className="pr-4 tabular-nums">{c.impressions ? rate(c.clicks, c.impressions) : "—"}</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Aún no hay campañas. Créalas desde <Link href="/datos" className="underline">Carga de datos</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
