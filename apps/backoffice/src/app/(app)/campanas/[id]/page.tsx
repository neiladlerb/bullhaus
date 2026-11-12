import Link from "next/link";
import { notFound } from "next/navigation";
import { can, CAMPAIGN_STATUS_LABELS, formatDate, formatPrice, OBJECTIVE_LABELS, rate } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { STATUS_CHIP } from "@/components/campaign-status";
import { Kpi } from "@/components/bars";
import { requireUser } from "@/lib/auth";
import { approveCampaignAction, returnToDraftAction, submitCampaignAction, updatePostAction } from "../actions";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("campaigns.read");
  const { id } = await params;
  const c = await prisma.campaign.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      approvedBy: { select: { name: true } },
      posts: {
        orderBy: { order: "asc" },
        include: { property: { select: { id: true, code: true, media: { where: { isCover: true }, take: 1, select: { sizes: true } } } } },
      },
      _count: { select: { leads: true } },
    },
  });
  if (!c) notFound();
  const leadsByStage = await prisma.lead.groupBy({ by: ["stage"], where: { campaignId: c.id }, _count: true });
  const won = leadsByStage.find((s) => s.stage === "ganado")?._count ?? 0;
  const canApprove = can(user.role, "campaigns.approve");
  const canWrite = can(user.role, "campaigns.write");
  const editable = canWrite && ["borrador", "en_revision", "aprobada"].includes(c.status);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/campanas" className="text-sm text-muted hover:underline">
          ← Campañas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{c.name}</h1>
          <span className={`chip ${STATUS_CHIP[c.status]}`}>{CAMPAIGN_STATUS_LABELS[c.status]}</span>
          {c.isDemo && <span className="chip bg-paper text-muted">demo</span>}
        </div>
        <p className="mt-1 text-sm text-muted">
          {OBJECTIVE_LABELS[c.objective]} · Instagram
          {c.startsAt && c.endsAt && ` · ${formatDate(c.startsAt)} – ${formatDate(c.endsAt)}`}
          {c.approvedBy && c.approvedAt && ` · aprobada por ${c.approvedBy.name} el ${formatDate(c.approvedAt)}`}
        </p>
      </div>

      {c.status === "en_revision" && (
        <div className="card flex flex-wrap items-center gap-3 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mr-auto">
            Revisa los textos y el presupuesto de {c.budgetClp ? formatPrice(c.budgetClp, "CLP") : "—"}. Al aprobar, las piezas quedan listas para publicar; nada sale solo.
          </p>
          {canApprove ? (
            <>
              <form action={returnToDraftAction}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn-ghost">Devolver a borrador</button>
              </form>
              <form action={approveCampaignAction}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn-brand">Aprobar campaña</button>
              </form>
            </>
          ) : (
            <span>Espera la aprobación de un administrador.</span>
          )}
        </div>
      )}
      {c.status === "borrador" && canWrite && (
        <form action={submitCampaignAction} className="card flex items-center gap-3 p-4 text-sm">
          <input type="hidden" name="id" value={c.id} />
          <p className="mr-auto text-muted">Borrador. Envíalo a revisión cuando los textos estén listos.</p>
          <button className="btn-primary">Enviar a revisión</button>
        </form>
      )}
      {c.status === "aprobada" && (
        <p className="card p-4 text-sm text-muted">
          Aprobada. La publicación en Instagram y la activación del presupuesto en Meta se conectan en el módulo de redes; hasta entonces se publica a mano con estos textos.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Presupuesto" value={c.budgetClp ? formatPrice(c.budgetClp, "CLP") : "—"} sub={c.spendClp ? `${formatPrice(c.spendClp, "CLP")} invertidos` : undefined} />
        <Kpi label="Alcance" value={c.reach.toLocaleString("es-CL")} sub={`${c.impressions.toLocaleString("es-CL")} impresiones`} />
        <Kpi label="Clics" value={c.clicks.toLocaleString("es-CL")} sub={`CTR ${rate(c.clicks, c.impressions)}`} />
        <Kpi label="Leads" value={String(c._count.leads)} sub={c._count.leads && c.spendClp ? `${formatPrice(c.spendClp / c._count.leads, "CLP")} por lead` : undefined} />
        <Kpi label="Cerrados" value={String(won)} sub={rate(won, c._count.leads)} />
      </section>

      <section className="card p-5 text-sm">
        <h2 className="font-medium">Público</h2>
        <p className="mt-1 text-muted">{c.audience}</p>
      </section>

      {c.posts.length > 0 && (
        <section>
          <h2 className="font-medium">Piezas ({c.posts.length})</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {c.posts.map((p) => {
              const cover = (p.property?.media[0]?.sizes as Record<string, string> | undefined)?.md;
              return (
                <article key={p.id} className="card overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">BH</span>
                    <span className="font-semibold">bullhaus_propiedades</span>
                    <span className="ml-auto chip bg-paper capitalize">{p.format}</span>
                  </div>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${cover}`} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-ink p-8 text-center text-xl font-semibold text-white">{p.hook}</div>
                  )}
                  <div className="space-y-2 p-3 text-sm">
                    <p className="font-semibold">{p.hook}</p>
                    <p className="whitespace-pre-line text-[13px] leading-relaxed">{p.caption}</p>
                    <p className="text-[13px] text-sky-800">{p.hashtags.join(" ")}</p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className={`chip ${p.status === "aprobado" ? "bg-green-100 text-green-800" : "bg-paper"}`}>{p.status === "aprobado" ? "Aprobado" : p.status === "publicado" ? "Publicado" : "Borrador"}</span>
                      {p.scheduledAt && <span>Programado {formatDate(p.scheduledAt)}</span>}
                      {p.property && (
                        <Link href={`/propiedades/${p.property.id}`} className="hover:underline">
                          Ficha {p.property.code}
                        </Link>
                      )}
                      <span>Botón: {p.cta}</span>
                    </p>
                    {editable && p.status !== "publicado" && (
                      <details className="pt-1">
                        <summary className="cursor-pointer text-xs font-semibold text-muted">Editar texto</summary>
                        <form action={updatePostAction} className="mt-2 space-y-2">
                          <input type="hidden" name="postId" value={p.id} />
                          <input name="hook" defaultValue={p.hook} className="input" maxLength={140} />
                          <textarea name="caption" defaultValue={p.caption} rows={8} className="input" maxLength={2200} />
                          <p className="text-[11px] text-muted">Al guardar, la pieza vuelve a revisión. Usa solo datos de la ficha aprobada.</p>
                          <button className="btn-ghost text-xs">Guardar</button>
                        </form>
                      </details>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
