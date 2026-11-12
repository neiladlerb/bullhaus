import Link from "next/link";
import { can, formatDate, LINKEDIN_SERIES, LINKEDIN_TIPS, rate, SOCIAL_POST_STATUS_LABELS, TIP_TOPIC_LABELS, type TipTopic } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Bars, Kpi } from "@/components/bars";
import { Chip, DemoTag, SimulatedNote } from "@/components/demo";
import { LineChart } from "@/components/line-chart";
import { requireUser } from "@/lib/auth";
import { RedesTabs } from "../tabs";
import { approvePostAction, createTipDraftAction, publishPostAction, rejectPostAction, submitPostAction, updateCaptionAction } from "./actions";

const STATUS_TONE = { borrador: "gray", en_revision: "amber", aprobado: "sky", publicado: "green", rechazado: "red" } as const;
const ERRORS: Record<string, string> = {
  "sin-cuenta": "No hay una página de LinkedIn conectada. Revisa Integraciones.",
  "sin-consejos": "Ya se usaron todos los consejos de esa categoría. Agrega más a la biblioteca o edita un borrador.",
  "no-conectado": "LinkedIn no está conectado: la publicación real quedó bloqueada. El post sigue aprobado.",
};
const topicLabel = (t: string | null) => (t && t in TIP_TOPIC_LABELS ? TIP_TOPIC_LABELS[t as TipTopic] : "—");
const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function LinkedInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("campaigns.read");
  const sp = await searchParams;
  const accounts = await prisma.socialAccount.findMany({ where: { tenantId: user.tenantId }, orderBy: { platform: "desc" } });
  const account = accounts.find((a) => a.platform === "linkedin");
  const write = can(user.role, "campaigns.write");
  const approve = can(user.role, "campaigns.approve");

  if (!account) {
    return (
      <div className="max-w-6xl space-y-6">
        <RedesTabs accounts={accounts} current="linkedin" />
        <p className="card p-6 text-sm text-muted">
          No hay página de LinkedIn conectada. Para la demostración, carga los datos en <Link href="/datos" className="underline">Carga de datos</Link>; para producción, revisa{" "}
          <Link href="/integraciones" className="underline">Integraciones</Link>.
        </p>
      </div>
    );
  }

  const [daily, posts] = await Promise.all([
    prisma.socialDaily.findMany({ where: { accountId: account.id }, orderBy: { date: "asc" } }),
    prisma.socialPost.findMany({ where: { accountId: account.id }, orderBy: [{ scheduledAt: "asc" }, { publishedAt: "asc" }] }),
  ]);
  const published = posts.filter((p) => p.status === "publicado").sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  const pipeline = posts.filter((p) => p.status !== "publicado");
  const followers = daily.at(-1)?.followers ?? account.followers;
  const gained30 = followers - (daily.at(-31)?.followers ?? followers);
  const impressions = published.reduce((a, p) => a + p.impressions, 0);
  const engagements = (p: (typeof posts)[number]) => p.likes + p.comments + p.shares + p.clicks;
  const byTopic = (Object.keys(TIP_TOPIC_LABELS) as TipTopic[]).map((t) => {
    const ps = published.filter((p) => p.topic === t);
    return { label: TIP_TOPIC_LABELS[t], value: ps.length ? Math.round(ps.reduce((a, p) => a + p.impressions, 0) / ps.length) : 0 };
  });
  const unused = LINKEDIN_TIPS.filter((t) => !posts.some((p) => p.title === t.title)).length;

  return (
    <div className="max-w-6xl space-y-6">
      <RedesTabs accounts={accounts} current="linkedin" />
      <div>
        <h1 className="text-2xl font-semibold">
          LinkedIn · serie “{LINKEDIN_SERIES}”
          {account.isDemo && <DemoTag />}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Consejos para vender, comprar y arrendar mejor, publicados cada martes en la página de empresa. Cada post sale de la biblioteca de consejos, lo revisa una persona de Bull Haus y solo se publica con su aprobación.
        </p>
      </div>
      {account.connectedVia === "demo" && <SimulatedNote what="La página de LinkedIn está conectada en modo demostración: seguidores e impresiones son simulados; los textos son los de la biblioteca." integration="LinkedIn" />}
      {sp.error && ERRORS[sp.error] && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{ERRORS[sp.error]}</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Seguidores" value={followers.toLocaleString("es-CL")} sub={`+${gained30.toLocaleString("es-CL")} en 30 días`} />
        <Kpi label="Consejos publicados" value={String(published.length)} sub={`${pipeline.filter((p) => p.status === "aprobado").length} aprobados en cola`} />
        <Kpi label="Impresiones de la serie" value={impressions.toLocaleString("es-CL")} sub={published.length ? `${Math.round(impressions / published.length).toLocaleString("es-CL")} por post` : undefined} />
        <Kpi label="Clics a bullhaus.cl" value={published.reduce((a, p) => a + p.clicks, 0).toLocaleString("es-CL")} sub={`interacción ${rate(published.reduce((a, p) => a + engagements(p), 0), impressions)}`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-medium">Seguidores (90 días)</h2>
          <div className="mt-4">
            <LineChart points={daily.map((d) => d.followers)} labels={daily.length ? [formatDate(daily[0]!.date), formatDate(daily.at(-1)!.date)] : undefined} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Impresiones promedio por tema</h2>
          <div className="mt-4"><Bars rows={byTopic} /></div>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-medium">Calendario editorial</h2>
            <p className="text-xs text-muted">Borrador → en revisión → aprobado → publicado. Editar un post aprobado lo devuelve a revisión. Quedan {unused} consejos sin usar en la biblioteca.</p>
          </div>
          {write && (
            <form action={createTipDraftAction} className="flex gap-2">
              <select name="topic" className="input py-1.5 text-sm" defaultValue="">
                <option value="">Cualquier tema</option>
                {(Object.keys(TIP_TOPIC_LABELS) as TipTopic[]).map((t) => (
                  <option key={t} value={t}>{TIP_TOPIC_LABELS[t]}</option>
                ))}
              </select>
              <button className="btn-primary text-sm" disabled={!unused}>Nuevo borrador</button>
            </form>
          )}
        </div>
        {pipeline.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No hay posts en preparación.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pipeline.map((p) => (
              <li key={p.id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Chip tone={STATUS_TONE[p.status]}>{SOCIAL_POST_STATUS_LABELS[p.status]}</Chip>
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted">· {topicLabel(p.topic)} · {p.scheduledAt ? `programado ${formatDate(p.scheduledAt)}` : "sin fecha"}</span>
                  {p.approvedAt && <span className="text-xs text-muted">· aprobado {formatDate(p.approvedAt)}</span>}
                </div>
                <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto]">
                  {write && p.status !== "publicado" ? (
                    <form action={updateCaptionAction} className="space-y-2">
                      <input type="hidden" name="id" value={p.id} />
                      <textarea name="caption" defaultValue={p.caption} rows={9} className="input w-full font-[inherit] text-sm leading-relaxed" />
                      <div className="flex flex-wrap items-center gap-2">
                        <input type="date" name="date" defaultValue={isoDate(p.scheduledAt)} className="input py-1 text-sm" aria-label="Fecha de publicación" />
                        <button className="btn-ghost text-sm">Guardar cambios</button>
                      </div>
                    </form>
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-relaxed">{p.caption}</p>
                  )}
                  <div className="flex flex-row flex-wrap items-start gap-2 lg:w-40 lg:flex-col">
                    {write && p.status === "borrador" && (
                      <form action={submitPostAction}><input type="hidden" name="id" value={p.id} /><button className="btn-primary w-full text-sm">Enviar a revisión</button></form>
                    )}
                    {approve && p.status === "en_revision" && (
                      <form action={approvePostAction}><input type="hidden" name="id" value={p.id} /><button className="btn-primary w-full text-sm">Aprobar</button></form>
                    )}
                    {approve && p.status === "aprobado" && (
                      <form action={publishPostAction}><input type="hidden" name="id" value={p.id} /><button className="btn-brand w-full text-sm">Publicar ahora</button></form>
                    )}
                    {approve && ["en_revision", "aprobado"].includes(p.status) && (
                      <form action={rejectPostAction}><input type="hidden" name="id" value={p.id} /><button className="btn-ghost w-full text-sm">Rechazar</button></form>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="font-medium">Publicados</h2>
        <table className="mt-3 w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-2 font-semibold">Fecha</th>
              <th className="font-semibold">Consejo</th>
              <th className="font-semibold">Tema</th>
              <th className="font-semibold">Impresiones</th>
              <th className="font-semibold">Reacciones</th>
              <th className="font-semibold">Comentarios</th>
              <th className="font-semibold">Compartidos</th>
              <th className="font-semibold">Clics</th>
              <th className="font-semibold">Interacción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {published.map((p) => (
              <tr key={p.id}>
                <td className="py-2 tabular-nums text-muted">{p.publishedAt ? formatDate(p.publishedAt) : "—"}</td>
                <td>
                  <details>
                    <summary className="cursor-pointer">{p.title ?? p.caption.split("\n")[0]}</summary>
                    <p className="mt-2 max-w-xl whitespace-pre-line text-xs leading-relaxed text-muted">{p.caption}</p>
                  </details>
                </td>
                <td className="text-muted">{topicLabel(p.topic)}</td>
                <td className="tabular-nums">{p.impressions.toLocaleString("es-CL")}</td>
                <td className="tabular-nums">{p.likes}</td>
                <td className="tabular-nums">{p.comments}</td>
                <td className="tabular-nums">{p.shares}</td>
                <td className="tabular-nums">{p.clicks}</td>
                <td className="tabular-nums">{rate(engagements(p), p.impressions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
