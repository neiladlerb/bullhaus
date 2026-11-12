import Link from "next/link";
import { formatDate, rate } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Bars, Kpi } from "@/components/bars";
import { Chip, SimulatedNote } from "@/components/demo";
import { LineChart } from "@/components/line-chart";
import { requireUser } from "@/lib/auth";
import { RedesTabs } from "./tabs";
import { since } from "@/lib/leads";

const FORMAT_LABEL = { post: "Post", carrusel: "Carrusel", reel: "Reel", historia: "Historia" } as const;
const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export default async function RedesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("campaigns.read");
  const sp = await searchParams;
  const accounts = await prisma.socialAccount.findMany({ where: { tenantId: user.tenantId }, orderBy: { platform: "desc" } });
  const meta = accounts.filter((a) => a.platform !== "linkedin");
  const account = meta.find((a) => a.platform === (sp.red === "facebook" ? "facebook" : "instagram")) ?? meta[0];

  if (!account) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Redes sociales</h1>
        <p className="card p-6 text-sm text-muted">
          No hay cuentas de Instagram ni Facebook conectadas. La serie de LinkedIn está en la pestaña <Link href="/redes/linkedin" className="underline">LinkedIn</Link>. Para la demostración, carga los datos en <Link href="/datos" className="underline">Carga de datos</Link>; para producción, revisa <Link href="/integraciones" className="underline">Integraciones</Link>.
        </p>
      </div>
    );
  }

  const [daily, posts] = await Promise.all([
    prisma.socialDaily.findMany({ where: { accountId: account.id }, orderBy: { date: "asc" } }),
    prisma.socialPost.findMany({
      where: { accountId: account.id, status: "publicado", publishedAt: { gte: since(90) } },
      orderBy: { publishedAt: "desc" },
      include: { property: { select: { id: true, code: true, media: { where: { isCover: true }, take: 1, select: { sizes: true } } } } },
    }),
  ]);
  const last30 = daily.slice(-30);
  const prev30 = daily.slice(-60, -30);
  const sum = (rows: typeof daily, k: "reach" | "profileVisits" | "messages") => rows.reduce((a, r) => a + r[k], 0);
  const followers = daily.at(-1)?.followers ?? account.followers;
  const gained30 = followers - (daily.at(-31)?.followers ?? followers);
  const eng = (p: (typeof posts)[number]) => p.likes + p.comments + p.saves + p.shares;
  const top = [...posts].sort((a, b) => eng(b) / b.reach - eng(a) / a.reach).slice(0, 6);
  const byFormat = (["carrusel", "reel", "post"] as const).map((f) => {
    const ps = posts.filter((p) => p.format === f);
    return { label: FORMAT_LABEL[f], value: ps.length ? Math.round(ps.reduce((a, p) => a + p.reach, 0) / ps.length) : 0, accent: f === "reel" };
  });
  const byDay = DAYS.map((label, i) => {
    const ps = posts.filter((p) => new Date(p.publishedAt!.getTime() - 3 * 3_600_000).getUTCDay() === i);
    return { label, value: ps.length ? Math.round(ps.reduce((a, p) => a + eng(p), 0) / ps.length) : 0 };
  });
  const delta = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)} % vs. 30 días anteriores` : undefined);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Redes sociales</h1>
          <p className="mt-1 text-sm text-muted">Resultados orgánicos de Instagram y Facebook (API Graph). La publicidad pagada está en Campañas y en Control de gestión; los consejos de LinkedIn, en su pestaña.</p>
        </div>
        <RedesTabs accounts={accounts} current={account.platform} />
      </div>
      {account.connectedVia === "demo" && <SimulatedNote what={`La cuenta ${account.handle} está conectada en modo demostración: seguidores, alcance y publicaciones son simulados (los textos salen de las fichas reales).`} integration="Meta (Instagram y Facebook)" />}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Seguidores" value={followers.toLocaleString("es-CL")} sub={`+${gained30.toLocaleString("es-CL")} en 30 días`} />
        <Kpi label="Alcance 30 días" value={sum(last30, "reach").toLocaleString("es-CL")} sub={delta(sum(last30, "reach"), sum(prev30, "reach"))} />
        <Kpi label="Visitas al perfil" value={sum(last30, "profileVisits").toLocaleString("es-CL")} sub={delta(sum(last30, "profileVisits"), sum(prev30, "profileVisits"))} />
        <Kpi label="Mensajes directos" value={sum(last30, "messages").toLocaleString("es-CL")} sub="los atiende el agente IA" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-medium">Seguidores (120 días)</h2>
          <div className="mt-4">
            <LineChart points={daily.map((d) => d.followers)} labels={daily.length ? [formatDate(daily[0]!.date), formatDate(daily.at(-1)!.date)] : undefined} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Alcance promedio por formato</h2>
          <div className="mt-4"><Bars rows={byFormat} /></div>
          <h2 className="mt-6 font-medium">Interacción por día de publicación</h2>
          <div className="mt-4"><Bars rows={byDay} /></div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-medium">Publicaciones con mejor interacción (90 días)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((p) => {
            const cover = (p.property?.media[0]?.sizes as Record<string, string> | undefined)?.md;
            return (
              <article key={p.id} className="overflow-hidden rounded-lg border border-line">
                {cover ? <img src={`/media/${cover}`} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-paper" />}
                <div className="space-y-1 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <Chip tone="gray">{FORMAT_LABEL[p.format]}</Chip>
                    <span className="text-muted">{p.publishedAt ? formatDate(p.publishedAt) : "—"}</span>
                  </div>
                  <p className="line-clamp-2 text-sm">{p.caption.split("\n")[0]}</p>
                  <p className="text-muted">
                    Alcance {p.reach.toLocaleString("es-CL")} · {p.likes} me gusta · {p.comments} comentarios · {p.saves} guardados · interacción {rate(eng(p), p.reach)}
                  </p>
                  {p.property && <Link href={`/propiedades/${p.property.id}`} className="underline">{p.property.code}</Link>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="font-medium">Todas las publicaciones (90 días)</h2>
        <table className="mt-3 w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-2 font-semibold">Fecha</th>
              <th className="font-semibold">Formato</th>
              <th className="font-semibold">Propiedad</th>
              <th className="font-semibold">Alcance</th>
              <th className="font-semibold">Me gusta</th>
              <th className="font-semibold">Comentarios</th>
              <th className="font-semibold">Guardados</th>
              <th className="font-semibold">Interacción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {posts.map((p) => (
              <tr key={p.id}>
                <td className="py-2 tabular-nums text-muted">{p.publishedAt ? formatDate(p.publishedAt) : "—"}</td>
                <td>{FORMAT_LABEL[p.format]}</td>
                <td>{p.property?.code ?? "—"}</td>
                <td className="tabular-nums">{p.reach.toLocaleString("es-CL")}</td>
                <td className="tabular-nums">{p.likes}</td>
                <td className="tabular-nums">{p.comments}</td>
                <td className="tabular-nums">{p.saves}</td>
                <td className="tabular-nums">{rate(eng(p), p.reach)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
