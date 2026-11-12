import Link from "next/link";
import { CHANNEL_LABELS, formatDate, OUTCOME_LABELS, type Channel } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import { Chip, DemoTag } from "@/components/demo";
import { requireUser } from "@/lib/auth";
import { replyAction, returnConversationAction, takeConversationAction } from "../actions";
import { AgentTabs } from "../tabs";

const time = (d: Date) => d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" });
const dateTime = (d: Date) => `${formatDate(d)} ${time(d)}`;
const STATUS = { agente: { label: "Agente", tone: "sky" }, humano: { label: "Corredor", tone: "amber" }, cerrada: { label: "Cerrada", tone: "gray" } } as const;

export default async function BandejaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("agents.read");
  const sp = await searchParams;
  const where: Prisma.ConversationWhereInput = { tenantId: user.tenantId };
  if (sp.canal && sp.canal in CHANNEL_LABELS) where.channel = sp.canal as Channel;
  if (sp.estado === "agente" || sp.estado === "humano" || sp.estado === "cerrada") where.status = sp.estado;
  if (sp.marcadas) where.flagged = true;
  const list = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 60,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, role: true } }, property: { select: { code: true } } },
  });
  const selectedId = sp.c ?? list[0]?.id;
  const conv = selectedId
    ? await prisma.conversation.findFirst({
        where: { id: selectedId, tenantId: user.tenantId },
        include: { messages: { orderBy: { createdAt: "asc" } }, property: { select: { id: true, code: true, comuna: true } }, lead: { select: { id: true, kind: true, stage: true } } },
      })
    : null;
  const qs = (patch: Record<string, string | undefined>) => `/agentes/bandeja?${new URLSearchParams(Object.entries({ ...sp, ...patch }).filter((e): e is [string, string] => Boolean(e[1])))}`;

  return (
    <div className="max-w-7xl space-y-5">
      <h1 className="text-2xl font-semibold">Agentes IA</h1>
      <AgentTabs active="bandeja" />
      <div className="flex flex-wrap gap-1.5 text-xs">
        <Link href={qs({ canal: undefined, c: undefined })} className={`chip ${!sp.canal ? "bg-ink text-white" : "bg-white"}`}>Todos los canales</Link>
        {(Object.keys(CHANNEL_LABELS) as Channel[]).map((ch) => (
          <Link key={ch} href={qs({ canal: ch, c: undefined })} className={`chip ${sp.canal === ch ? "bg-ink text-white" : "bg-white"}`}>{CHANNEL_LABELS[ch]}</Link>
        ))}
        <span className="mx-1 text-line">|</span>
        <Link href={qs({ estado: undefined, c: undefined })} className={`chip ${!sp.estado ? "bg-ink text-white" : "bg-white"}`}>Todas</Link>
        {(["agente", "humano", "cerrada"] as const).map((s) => (
          <Link key={s} href={qs({ estado: s, c: undefined })} className={`chip ${sp.estado === s ? "bg-ink text-white" : "bg-white"}`}>{STATUS[s].label}</Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <ul className="card max-h-[70vh] divide-y divide-line overflow-auto">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={qs({ c: c.id })} className={`block px-4 py-3 text-sm hover:bg-paper/60 ${c.id === selectedId ? "bg-paper" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{c.contactName}</span>
                  <span className="shrink-0 text-xs text-muted">{formatDate(c.lastMessageAt).slice(0, 5)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <span>{CHANNEL_LABELS[c.channel]}</span>
                  {c.property && <span>· {c.property.code}</span>}
                  <span className="ml-auto"><Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip></span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">{c.messages[0]?.body}</p>
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No hay conversaciones.</li>}
        </ul>

        {conv ? (
          <section className="card flex max-h-[70vh] flex-col">
            <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
              <div className="mr-auto">
                <p className="font-medium">
                  {conv.contactName}
                  {conv.isDemo && <DemoTag />}
                </p>
                <p className="text-xs text-muted">
                  {CHANNEL_LABELS[conv.channel]} · {conv.contactHandle} · desde {dateTime(conv.startedAt)}
                  {conv.property && (
                    <>
                      {" · "}
                      <Link href={`/propiedades/${conv.property.id}`} className="underline">{conv.property.code}</Link>
                    </>
                  )}
                  {conv.outcome && ` · ${OUTCOME_LABELS[conv.outcome] ?? conv.outcome}`}
                </p>
              </div>
              {conv.status === "agente" && (
                <form action={takeConversationAction.bind(null, conv.id)}>
                  <button className="btn-brand">Tomar conversación</button>
                </form>
              )}
              {conv.status === "humano" && (
                <form action={returnConversationAction.bind(null, conv.id)}>
                  <button className="btn-ghost">Devolver al agente</button>
                </form>
              )}
            </header>
            <div className="flex-1 space-y-2 overflow-auto bg-paper/40 px-5 py-4">
              {conv.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "contacto" ? "justify-start" : m.role === "sistema" ? "justify-center" : "justify-end"}`}>
                  {m.role === "sistema" ? (
                    <p className="max-w-md rounded-md bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-900">{m.body}</p>
                  ) : (
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.role === "contacto" ? "rounded-bl-sm bg-white" : m.role === "agente" ? "rounded-br-sm bg-ink text-white" : "rounded-br-sm bg-brand text-white"}`}>
                      <p className="whitespace-pre-line">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.role === "contacto" ? "text-muted" : "text-white/70"}`}>
                        {m.role === "agente" ? "Asistente virtual" : m.role === "corredor" ? "Corredor" : ""} {time(m.createdAt)}
                        {m.tool && <span className="ml-1 rounded bg-white/15 px-1 font-mono">{m.tool}</span>}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {conv.status === "humano" ? (
              <form action={replyAction.bind(null, conv.id)} className="flex gap-2 border-t border-line p-3">
                <input name="body" className="input" placeholder={conv.isDemo ? "Escribe una respuesta (en la demo no se envía)" : "Escribe una respuesta"} autoComplete="off" />
                <button className="btn-primary">Enviar</button>
              </form>
            ) : (
              <p className="border-t border-line px-5 py-3 text-xs text-muted">
                {conv.status === "agente" ? "El agente está atendiendo. Toma la conversación para responder tú." : "Conversación cerrada."}
              </p>
            )}
          </section>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">Elige una conversación.</div>
        )}
      </div>
    </div>
  );
}
