import Link from "next/link";
import { can, formatDateTimeCl, SOCIAL_POST_STATUS_LABELS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Kpi } from "@/components/bars";
import { Chip, SimulatedNote } from "@/components/demo";
import { requireUser } from "@/lib/auth";
import { since } from "@/lib/leads";
import { SOCIAL_AGENT_EVENT_LABELS, socialAgentSettings } from "@/lib/social-agent";
import { AgentTabs } from "../tabs";
import { approveAgentPostAction, draftNowAction, editAgentPostAction, publishAgentPostAction, rejectAgentPostAction, saveSocialAgentAction } from "./actions";

const PLATFORM_LABELS = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" } as const;
const EVENT_TONE = { borrador: "violet", respuesta_comentario: "sky", respuesta_mensaje: "green", derivacion: "amber", informe: "gray" } as const;
const n = (x: number) => x.toLocaleString("es-CL");

export default async function SocialAgentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("agents.read");
  const sp = await searchParams;
  const t = user.tenantId;
  const from = since(30);
  const [settings, queue, events, published, kinds] = await Promise.all([
    socialAgentSettings(t),
    prisma.socialPost.findMany({
      where: { tenantId: t, byAgent: true, status: { in: ["en_revision", "aprobado"] } },
      include: { account: { select: { platform: true } }, property: { select: { code: true, comuna: true } } },
      orderBy: [{ scheduledAt: "asc" }],
    }),
    prisma.socialAgentEvent.findMany({ where: { tenantId: t }, orderBy: { at: "desc" }, take: 40 }),
    prisma.socialPost.findMany({ where: { tenantId: t, status: "publicado", publishedAt: { gte: from }, account: { platform: { in: ["instagram", "facebook"] } } }, select: { byAgent: true, reach: true } }),
    prisma.socialAgentEvent.groupBy({ by: ["kind"], where: { tenantId: t, at: { gte: from } }, _count: true }),
  ]);
  const count = (k: keyof typeof SOCIAL_AGENT_EVENT_LABELS) => kinds.find((x) => x.kind === k)?._count ?? 0;
  const agentPosts = published.filter((p) => p.byAgent);
  const avgReach = (xs: { reach: number }[]) => (xs.length ? Math.round(xs.reduce((a, p) => a + p.reach, 0) / xs.length) : 0);
  const demo = events.some((e) => e.isDemo) || queue.some((q) => q.isDemo);
  const canApprove = can(user.role, "campaigns.approve");
  const canWrite = can(user.role, "campaigns.write");
  const canManage = can(user.role, "agents.manage");

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agentes IA</h1>
          <p className="mt-1 text-sm text-muted">Agente de redes sociales: prepara publicaciones con las fichas aprobadas, responde comentarios y mensajes, y deriva al corredor lo que no le corresponde.</p>
        </div>
        {settings.enabled ? <Chip tone="green">Encendido</Chip> : <Chip tone="gray">Apagado</Chip>}
      </div>
      {demo && <SimulatedNote what="Las publicaciones, respuestas y derivaciones de este agente son ficticias." integration="Meta (Instagram y Facebook), LinkedIn y Claude" />}
      <AgentTabs active="redes" />

      {sp.error === "no-conectado" && <p className="rounded-md bg-amber-100 px-4 py-2 text-sm text-amber-900">Meta todavía no está conectado: la publicación real queda bloqueada hasta conectar la cuenta en Integraciones.</p>}
      {sp.borradores !== undefined && <p className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-900">{sp.borradores === "0" ? "No hay propiedades nuevas para publicar: todas tienen una publicación reciente o en revisión." : `El agente preparó ${sp.borradores} borradores. Quedan en revisión.`}</p>}
      {sp.ok === "ajustes" && <p className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-900">Ajustes guardados.</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Borradores preparados" value={n(count("borrador"))} sub="últimos 30 días" />
        <Kpi label="Publicados del agente" value={n(agentPosts.length)} sub={`de ${n(published.length)} en Instagram y Facebook`} />
        <Kpi label="Comentarios respondidos" value={n(count("respuesta_comentario"))} />
        <Kpi label="Mensajes directos" value={n(count("respuesta_mensaje"))} sub="respondidos" />
        <Kpi label="Derivados a un corredor" value={n(count("derivacion"))} sub={`alcance medio por post ${n(avgReach(agentPosts))}`} />
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-semibold">Para aprobar</h2>
            <p className="mt-1 text-sm text-muted">Nada se publica sin que una persona de Bull Haus lo apruebe. Editar un texto aprobado lo devuelve a revisión.</p>
          </div>
          {canWrite && (
            <form action={draftNowAction}>
              <button className="btn-ghost text-sm">Preparar borradores ahora</button>
            </form>
          )}
        </div>
        {queue.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No hay publicaciones esperando revisión.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {queue.map((p) => (
              <li key={p.id} className="grid gap-3 py-4 md:grid-cols-[12rem_1fr]">
                <div className="text-sm">
                  <p className="font-medium">{PLATFORM_LABELS[p.account.platform]} · {p.format}</p>
                  <p className="text-muted">{p.property ? `${p.property.code} · ${p.property.comuna}` : "Captación"}</p>
                  <p className="mt-1 text-xs text-muted">Programado {p.scheduledAt ? formatDateTimeCl(p.scheduledAt) : "sin fecha"}</p>
                  <div className="mt-2"><Chip tone={p.status === "aprobado" ? "green" : "amber"}>{SOCIAL_POST_STATUS_LABELS[p.status]}</Chip></div>
                </div>
                <div className="space-y-2">
                  <form action={editAgentPostAction} className="space-y-2">
                    <input type="hidden" name="id" value={p.id} />
                    <textarea name="caption" defaultValue={p.caption} rows={6} className="input w-full text-sm" disabled={!canWrite} />
                    {canWrite && <button className="btn-ghost text-xs">Guardar texto</button>}
                  </form>
                  {canApprove && (
                    <div className="flex flex-wrap gap-2">
                      {p.status === "en_revision" && (
                        <form action={approveAgentPostAction}><input type="hidden" name="id" value={p.id} /><button className="btn-primary text-sm">Aprobar</button></form>
                      )}
                      {p.status === "aprobado" && (
                        <form action={publishAgentPostAction}><input type="hidden" name="id" value={p.id} /><button className="btn-primary text-sm">Publicar ahora</button></form>
                      )}
                      <form action={rejectAgentPostAction}><input type="hidden" name="id" value={p.id} /><button className="btn-ghost text-sm">Descartar</button></form>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="font-semibold">Bitácora</h2>
          <p className="mt-1 text-xs text-muted">Describe lo que hizo el agente. No guarda el texto de los comentarios ni de los mensajes de los contactos.</p>
          {events.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Sin actividad todavía.</p>
          ) : (
            <ul className="mt-4 space-y-2.5 text-sm">
              {events.map((e) => (
                <li key={e.id} className="grid grid-cols-[7.5rem_1fr] gap-3">
                  <span className="text-xs tabular-nums text-muted">{formatDateTimeCl(e.at)}</span>
                  <span>
                    <Chip tone={EVENT_TONE[e.kind]}>{SOCIAL_AGENT_EVENT_LABELS[e.kind]}</Chip> <span className="text-muted">{PLATFORM_LABELS[e.platform]}.</span> {e.summary}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <form action={saveSocialAgentAction} className="card space-y-3 p-5">
            <h2 className="font-semibold">Ajustes</h2>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} disabled={!canManage} /> Agente encendido</label>
            <fieldset className="space-y-1 text-sm">
              <legend className="label">Redes</legend>
              {(["instagram", "facebook", "linkedin"] as const).map((p) => (
                <label key={p} className="mr-4 inline-flex items-center gap-2"><input type="checkbox" name="platforms" value={p} defaultChecked={settings.platforms.includes(p)} disabled={!canManage} /> {PLATFORM_LABELS[p]}</label>
              ))}
            </fieldset>
            <label className="block text-sm"><span className="label">Publicaciones por semana</span><input type="number" name="postsPerWeek" min={1} max={14} defaultValue={settings.postsPerWeek} className="input mt-1 w-24" disabled={!canManage} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="draftNewListings" defaultChecked={settings.draftNewListings} disabled={!canManage} /> Preparar posts de propiedades nuevas</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="replyComments" defaultChecked={settings.replyComments} disabled={!canManage} /> Responder comentarios y mensajes</label>
            <label className="block text-sm"><span className="label">Tono</span><textarea name="tone" rows={2} defaultValue={settings.tone} className="input mt-1 w-full" disabled={!canManage} /></label>
            {canManage && <button className="btn-primary text-sm">Guardar ajustes</button>}
          </form>

          <div className="card p-5 text-sm">
            <h2 className="font-semibold">Reglas que sigue</h2>
            <ul className="mt-2 space-y-1.5 text-muted">
              <li>• El texto sale de la ficha aprobada; si un dato no está en la ficha, no lo escribe.</li>
              <li>• Solo publica propiedades disponibles y nunca la dirección exacta.</li>
              <li>• Toda publicación espera la aprobación de una persona del equipo.</li>
              <li>• En comentarios y mensajes se presenta como asistente virtual de Bull Haus.</li>
              <li>• No negocia precios ni asesora sobre créditos o temas legales: deriva al corredor.</li>
              <li>• No escribe en frío a nadie; solo responde a quien comenta o escribe.</li>
            </ul>
            <p className="mt-3 text-xs text-muted">LinkedIn tiene su propio flujo editorial en <Link href="/redes/linkedin" className="underline">Redes · LinkedIn</Link>.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
