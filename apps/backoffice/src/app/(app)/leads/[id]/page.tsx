import Link from "next/link";
import { notFound } from "next/navigation";
import { attributionChannel, can, CHANNEL_LABELS_ATTRIBUTION, CONTACT_TEMPLATES, dueState, formatDate, formatDateTimeCl, formatPrice, KIND_LABELS, SHARE_CHANNEL_LABELS, SOURCE_LABELS, STAGE_LABELS, TASK_KIND_LABELS, TIMEZONE, type TaskKind } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Chip, DemoTag } from "@/components/demo";
import { DUE_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { leadScope } from "@/lib/leads";
import { cancelTaskAction, completeTaskAction, createTaskAction, postponeTaskAction } from "./actions";

const DUE_LABEL = { vencido: "Vencido", hoy: "Hoy", proximo: "Próximo" } as const;
const ERRORS: Record<string, string> = { "sin-email": "Este contacto no tiene email registrado.", "sin-celular": "Este contacto no tiene celular registrado." };
const KINDS: TaskKind[] = ["llamar", "whatsapp", "email", "visita", "seguimiento"];
const santiagoDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("leads.read");
  const { id } = await params;
  const sp = await searchParams;
  const lead = await prisma.lead.findFirst({
    where: { id, ...leadScope(user) },
    include: {
      property: { select: { id: true, code: true, comuna: true } },
      broker: { select: { name: true } },
      brochure: { select: { id: true, title: true } },
      campaign: { select: { id: true, name: true } },
      tasks: { orderBy: { dueAt: "asc" }, include: { owner: { select: { name: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 20 },
      brochureShares: { orderBy: { sentAt: "desc" }, include: { brochure: { select: { id: true, title: true } } } },
    },
  });
  if (!lead) notFound();
  const write = can(user.role, "leads.write");
  const pipeline = lead.kind === "propietario" ? "captacion" : "demanda";
  const labels = STAGE_LABELS[pipeline];
  const pending = lead.tasks.filter((t) => t.status === "pendiente");
  const history = lead.tasks.filter((t) => t.status !== "pendiente").reverse();
  const templates = CONTACT_TEMPLATES.filter((t) => t.kinds.includes(lead.kind));
  const tomorrow = santiagoDay(new Date(Date.now() + 86_400_000));
  const contact = (canal: "whatsapp" | "email", extra: Record<string, string> = {}) => `/leads/${lead.id}/contactar?${new URLSearchParams({ canal, ...extra }).toString()}`;
  const origin = { utmSource: lead.utmSource ?? undefined, utmMedium: lead.utmMedium ?? undefined, gclid: lead.gclid ?? undefined, fbclid: lead.fbclid ?? undefined, referrerHost: lead.referrerHost ?? undefined };
  const ext = lead.isDemo ? {} : { target: "_blank", rel: "noopener" };

  return (
    <div className="max-w-5xl space-y-6">
      <Link href={`/pipeline${pipeline === "captacion" ? "?p=captacion" : ""}`} className="text-sm text-muted hover:underline">← Pipeline</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{lead.name}</h1>
        {lead.isDemo && <DemoTag />}
        <Chip tone="ink">{labels[lead.stage]}</Chip>
        <span className="text-sm text-muted">
          {KIND_LABELS[lead.kind]} · {SOURCE_LABELS[lead.source]} · desde el {formatDate(lead.createdAt)}
        </span>
      </div>
      {sp.error && ERRORS[sp.error] && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{ERRORS[sp.error]}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <section className="card space-y-3 p-5 text-sm">
          <h2 className="font-medium">Contacto</h2>
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-3"><dt className="text-muted">Celular</dt><dd>{lead.phone ?? "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Email</dt><dd className="break-all text-right">{lead.email ?? "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Corredor</dt><dd>{lead.broker?.name ?? "Sin asignar"}</dd></div>
            {lead.property && <div className="flex justify-between gap-3"><dt className="text-muted">Propiedad</dt><dd><Link href={`/propiedades/${lead.property.id}`} className="underline">{lead.property.code}</Link> · {lead.property.comuna}</dd></div>}
            {lead.comuna && !lead.property && <div className="flex justify-between gap-3"><dt className="text-muted">Comuna</dt><dd>{lead.comuna}</dd></div>}
            {lead.budget && lead.budgetCurrency && <div className="flex justify-between gap-3"><dt className="text-muted">Referencia</dt><dd className="tabular-nums">{formatPrice(Number(lead.budget), lead.budgetCurrency)}</dd></div>}
            {lead.brochure && <div className="flex justify-between gap-3"><dt className="text-muted">Llegó por</dt><dd className="text-right"><Link href={`/brochures/${lead.brochure.id}`} className="underline">brochure</Link></dd></div>}
            {lead.campaign && <div className="flex justify-between gap-3"><dt className="text-muted">Campaña</dt><dd className="text-right">{lead.campaign.name}</dd></div>}
          </dl>
          {lead.source === "web" && (
            <dl className="space-y-1.5 border-t border-line pt-3">
              <div className="flex justify-between gap-3"><dt className="text-muted">Canal</dt><dd>{CHANNEL_LABELS_ATTRIBUTION[attributionChannel(origin)]}</dd></div>
              {lead.utmCampaign && <div className="flex justify-between gap-3"><dt className="text-muted">Campaña (UTM)</dt><dd className="break-all text-right">{lead.utmCampaign}</dd></div>}
              {(lead.utmSource || lead.utmMedium) && <div className="flex justify-between gap-3"><dt className="text-muted">Fuente / medio</dt><dd className="break-all text-right">{lead.utmSource ?? "—"} / {lead.utmMedium ?? "—"}</dd></div>}
              {lead.utmContent && <div className="flex justify-between gap-3"><dt className="text-muted">Anuncio</dt><dd className="break-all text-right">{lead.utmContent}</dd></div>}
              {lead.landingPath && <div className="flex justify-between gap-3"><dt className="text-muted">Entró por</dt><dd className="break-all text-right">{lead.landingPath}</dd></div>}
              {lead.referrerHost && <div className="flex justify-between gap-3"><dt className="text-muted">Vino desde</dt><dd className="break-all text-right">{lead.referrerHost}</dd></div>}
            </dl>
          )}
          {lead.interest && <p className="rounded-md bg-paper p-3 text-sm">{lead.interest}</p>}

          {write && (
            <form action={`/leads/${lead.id}/contactar`} method="get" className="space-y-2 border-t border-line pt-3" {...ext}>
              <span className="label">Escribirle ahora con un mensaje prearmado</span>
              <select name="t" className="input w-full" defaultValue={templates[0]?.key}>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button name="canal" value="whatsapp" className="btn-primary text-sm" disabled={!lead.phone}>WhatsApp</button>
                <button name="canal" value="email" className="btn-ghost text-sm" disabled={!lead.email}>Email</button>
              </div>
              <p className="text-xs text-muted">Se abre tu WhatsApp o tu correo con el texto listo; lo envías tú. Nunca pidas documentos por chat: para eso está el portal de verificación.</p>
            </form>
          )}
        </section>

        <section className="card space-y-4 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Compromisos</h2>
            <span className="text-xs text-muted">{pending.length} pendientes</span>
          </div>
          {pending.length === 0 && <p className="text-sm text-muted">Sin compromisos pendientes. Agenda el próximo contacto para que no se enfríe.</p>}
          <ul className="space-y-3">
            {pending.map((t) => {
              const due = dueState(t.dueAt);
              return (
                <li key={t.id} className={`rounded-lg border p-3 ${due === "vencido" ? "border-red-200 bg-red-50/40" : "border-line"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Chip tone={DUE_TONE[due]}>{DUE_LABEL[due]}</Chip>
                    <span className="font-medium">{t.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {TASK_KIND_LABELS[t.kind]} · {formatDateTimeCl(t.dueAt)} · {t.owner?.name ?? "sin responsable"}
                    {t.templateKey ? ` · mensaje: ${CONTACT_TEMPLATES.find((x) => x.key === t.templateKey)?.label ?? t.templateKey}` : ""}
                  </p>
                  {t.note && <p className="mt-1 text-sm">{t.note}</p>}
                  {write && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lead.phone && t.kind !== "email" && (
                        <a href={contact("whatsapp", { task: t.id, ...(t.templateKey ? { t: t.templateKey } : {}) })} className="btn-primary px-3 py-1 text-xs" {...ext}>WhatsApp con mensaje</a>
                      )}
                      {lead.email && (t.kind === "email" || t.kind === "seguimiento") && (
                        <a href={contact("email", { task: t.id, ...(t.templateKey ? { t: t.templateKey } : {}) })} className="btn-ghost px-3 py-1 text-xs" {...ext}>Email prearmado</a>
                      )}
                      {t.kind === "llamar" && lead.phone && <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="btn-ghost px-3 py-1 text-xs">Llamar</a>}
                      <form action={completeTaskAction}><input type="hidden" name="id" value={t.id} /><button className="btn-ghost px-3 py-1 text-xs">Hecho</button></form>
                      <form action={postponeTaskAction}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="days" value="1" /><button className="btn-ghost px-3 py-1 text-xs">Mañana</button></form>
                      <form action={cancelTaskAction}><input type="hidden" name="id" value={t.id} /><button className="px-2 py-1 text-xs text-muted hover:underline">Cancelar</button></form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {write && (
            <form action={createTaskAction} className="grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <p className="label sm:col-span-2">Nuevo compromiso</p>
              <label>
                <span className="text-xs text-muted">Qué</span>
                <select name="kind" className="input" defaultValue="llamar">
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{TASK_KIND_LABELS[k]}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs text-muted">Mensaje prearmado (WhatsApp o email)</span>
                <select name="templateKey" className="input" defaultValue="">
                  <option value="">Ninguno</option>
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs text-muted">Compromiso</span>
                <input name="title" className="input w-full" required maxLength={160} placeholder="Ej.: enviarle el brochure y confirmar la visita del sábado" />
              </label>
              <label>
                <span className="text-xs text-muted">Fecha</span>
                <input type="date" name="date" className="input" defaultValue={tomorrow} required />
              </label>
              <label>
                <span className="text-xs text-muted">Hora (24 h)</span>
                <input type="time" name="time" className="input" defaultValue="10:00" required />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs text-muted">Nota (opcional)</span>
                <input name="note" className="input w-full" maxLength={500} />
              </label>
              <button className="btn-primary text-sm sm:col-span-2 sm:justify-self-start">Agendar compromiso</button>
            </form>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-medium">Historial</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {[
            ...history.map((t) => ({ at: t.doneAt ?? t.dueAt, text: `${t.status === "hecho" ? "Hecho" : "Cancelado"}: ${t.title}${t.note ? ` (${t.note})` : ""}` })),
            ...lead.events.map((e) => ({ at: e.createdAt, text: `Etapa: ${e.fromStage ? labels[e.fromStage] : "—"} → ${e.toStage ? labels[e.toStage] : "—"}${e.note ? ` (${e.note})` : ""}` })),
            ...lead.brochureShares.map((s) => ({ at: s.sentAt, text: `Brochure enviado por ${SHARE_CHANNEL_LABELS[s.channel]}: ${s.brochure.title}${s.openedAt ? ` · abierto el ${formatDateTimeCl(s.openedAt)}` : " · sin abrir"}` })),
          ]
            .sort((a, b) => b.at.getTime() - a.at.getTime())
            .map((h, i) => (
              <li key={i} className="flex gap-4 py-2">
                <span className="w-32 shrink-0 tabular-nums text-xs text-muted">{formatDateTimeCl(h.at)}</span>
                <span>{h.text}</span>
              </li>
            ))}
          <li className="flex gap-4 py-2">
            <span className="w-32 shrink-0 tabular-nums text-xs text-muted">{formatDateTimeCl(lead.createdAt)}</span>
            <span>Llegó por {SOURCE_LABELS[lead.source]}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
