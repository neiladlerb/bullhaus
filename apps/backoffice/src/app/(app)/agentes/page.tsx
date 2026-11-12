import Link from "next/link";
import { CHANNEL_LABELS, OUTCOME_LABELS, rate, type Channel } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Bars, Kpi } from "@/components/bars";
import { Chip, SimulatedNote } from "@/components/demo";
import { requireUser } from "@/lib/auth";
import { since } from "@/lib/leads";
import { AgentTabs } from "./tabs";

const CHANNELS: Channel[] = ["whatsapp", "instagram", "facebook", "voz"];
const BOOKED = ["visita_agendada", "tasacion_agendada", "llamada_agendada"];

export default async function AgentesPage() {
  const user = await requireUser("agents.read");
  const where = { tenantId: user.tenantId, startedAt: { gte: since(30) } };
  const [convs, settings, demo, flagged, social, socialDrafts] = await Promise.all([
    prisma.conversation.findMany({ where, select: { channel: true, outcome: true, status: true, costUsd: true, optedOut: true, _count: { select: { messages: true } } } }),
    prisma.agentSetting.findMany({ where: { tenantId: user.tenantId } }),
    prisma.conversation.count({ where: { tenantId: user.tenantId, isDemo: true } }),
    prisma.conversation.count({ where: { ...where, flagged: true } }),
    prisma.socialAgentSetting.findUnique({ where: { tenantId: user.tenantId } }),
    prisma.socialPost.count({ where: { tenantId: user.tenantId, byAgent: true, status: "en_revision" } }),
  ]);
  const total = convs.length;
  const booked = convs.filter((c) => BOOKED.includes(c.outcome ?? "")).length;
  const handed = convs.filter((c) => c.outcome === "derivada").length;
  const optOuts = convs.filter((c) => c.optedOut).length;
  const resolved = convs.filter((c) => c.outcome && c.outcome !== "derivada" && c.outcome !== "sin_respuesta").length;
  const cost = convs.reduce((a, c) => a + Number(c.costUsd), 0);
  const usd = (n: number) => `US$ ${n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agentes IA</h1>
        <p className="mt-1 text-sm text-muted">Asistente virtual de Bull Haus en WhatsApp, Instagram, Facebook y teléfono, y agente de redes sociales. Últimos 30 días.</p>
      </div>
      {demo > 0 && <SimulatedNote what="Las conversaciones son ficticias y siguen las reglas del agente real." integration="WhatsApp, Meta, telefonía y Claude" />}
      <AgentTabs active="resumen" />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Conversaciones" value={total.toLocaleString("es-CL")} sub={`${convs.reduce((a, c) => a + c._count.messages, 0).toLocaleString("es-CL")} mensajes`} />
        <Kpi label="Resueltas por el agente" value={rate(resolved, total)} sub="sin intervención de un corredor" />
        <Kpi label="Visitas y tasaciones agendadas" value={booked.toLocaleString("es-CL")} sub={`${rate(booked, total)} de las conversaciones`} />
        <Kpi label="Costo del período" value={usd(cost)} sub={total ? `${usd(cost / total)} por conversación` : undefined} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-medium">Por canal</h2>
          <div className="mt-4">
            <Bars rows={CHANNELS.map((ch) => ({ label: CHANNEL_LABELS[ch], value: convs.filter((c) => c.channel === ch).length, accent: ch === "whatsapp" }))} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Resultado</h2>
          <div className="mt-4">
            <Bars rows={Object.entries(OUTCOME_LABELS).map(([k, label]) => ({ label, value: convs.filter((c) => c.outcome === k).length, accent: BOOKED.includes(k) }))} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Calidad</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between">
              <span>Evals de conversación</span>
              <Chip tone="green">{demo ? "48 de 48 casos (simulado)" : "Sin ejecutar"}</Chip>
            </li>
            <li className="flex justify-between">
              <span>Marcadas por el filtro de salida</span>
              <Link href="/agentes/bandeja?marcadas=1" className="font-semibold underline">
                {flagged}
              </Link>
            </li>
            <li className="flex justify-between">
              <span>Derivadas a un corredor</span>
              <span className="font-semibold">{handed}</span>
            </li>
            <li className="flex justify-between">
              <span>Bajas (BAJA, STOP)</span>
              <span className="font-semibold">{optOuts}</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted">Las bajas se procesan en el código sin pasar por el modelo. El prompt no se edita desde aquí: cada cambio pasa por desarrollo y por los evals.</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map((ch) => {
          const s = settings.find((x) => x.channel === ch);
          return (
            <Link key={ch} href="/agentes/ajustes" className="card p-4 hover:border-ink">
              <div className="flex items-center justify-between">
                <p className="font-medium">{CHANNEL_LABELS[ch]}</p>
                {s?.enabled ? <Chip tone="green">Encendido</Chip> : <Chip tone="gray">Apagado</Chip>}
              </div>
              <p className="mt-2 text-xs text-muted">
                {s ? `${s.hoursFrom} a ${s.hoursTo} · máx. ${s.maxRejections} rechazos · visitas de ${s.visitMinutes} min` : "Sin configurar"}
              </p>
            </Link>
          );
        })}
        <Link href="/agentes/redes" className="card p-4 hover:border-ink md:col-span-2 lg:col-span-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Agente de redes sociales</p>
            {social?.enabled ? <Chip tone="green">Encendido</Chip> : <Chip tone="gray">Apagado</Chip>}
          </div>
          <p className="mt-2 text-xs text-muted">
            Prepara publicaciones de Instagram, Facebook y LinkedIn con las fichas aprobadas y responde comentarios.{" "}
            {socialDrafts ? `${socialDrafts} publicaciones esperan tu aprobación.` : "Sin publicaciones pendientes de aprobación."}
          </p>
        </Link>
      </section>
    </div>
  );
}
