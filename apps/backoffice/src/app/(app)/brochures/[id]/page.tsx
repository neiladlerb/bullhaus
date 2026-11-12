import Link from "next/link";
import { notFound } from "next/navigation";
import { BROCHURE_KIND_LABELS, BROCHURE_LEAD_KIND, BROCHURE_STATUS_LABELS, brochureShareText, can, formatDate, formatDateTimeCl, KIND_LABELS, OPEN_STAGES, rate, seesOnlyOwnProperties, SHARE_CHANNEL_LABELS, SOURCE_LABELS, STAGE_LABELS, TYPE_LABELS, type ShareChannel } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Bars, Kpi } from "@/components/bars";
import { Chip, DemoTag, SimulatedNote } from "@/components/demo";
import { BROCHURE_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { brochureUrl, canShare } from "@/lib/brochures";
import { leadScope } from "@/lib/leads";
import { approveBrochureAction, archiveBrochureAction, returnBrochureAction, submitBrochureAction, updateBrochureAction } from "../actions";
import { CopyBox } from "./copy-box";

const ERRORS: Record<string, string> = {
  "no-aprobado": "Este brochure todavía no está aprobado (o la propiedad ya no está disponible): no se puede compartir.",
  "sin-email": "Ese contacto no tiene email registrado. Envíalo por WhatsApp.",
};
const CHANNELS: ShareChannel[] = ["whatsapp", "instagram", "facebook", "linkedin", "email", "enlace"];

export default async function BrochurePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("leads.read");
  const { id } = await params;
  const sp = await searchParams;
  const b = await prisma.brochure.findFirst({
    where: { id, tenantId: user.tenantId, ...(seesOnlyOwnProperties(user.role) ? { OR: [{ createdById: user.id }, { property: { brokerId: user.id } }] } : {}) },
    include: {
      property: { select: { id: true, code: true, type: true, comuna: true, status: true } },
      shares: { orderBy: { sentAt: "desc" }, include: { lead: { select: { id: true, name: true } } } },
      leads: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, source: true, stage: true, createdAt: true, kind: true } },
    },
  });
  if (!b) notFound();
  const write = can(user.role, "leads.write") || can(user.role, "campaigns.write");
  const approve = can(user.role, "campaigns.approve");
  const shareable = canShare(b.status, b.property?.status, b.kind);
  const publicUrl = await brochureUrl(b.token);
  const kind = BROCHURE_LEAD_KIND[b.kind];

  const [contacts, senders] = await Promise.all([
    shareable && write
      ? prisma.lead.findMany({
          where: { ...leadScope(user), kind, stage: { in: [...OPEN_STAGES] }, ...(b.propertyId ? { OR: [{ propertyId: b.propertyId }, { propertyId: null }, { stage: { in: ["nuevo", "contactado", "calificado"] } }] } : {}) },
          orderBy: [{ stageChangedAt: "desc" }],
          take: 80,
          select: { id: true, name: true, phone: true, email: true, property: { select: { code: true } } },
        })
      : [],
    prisma.user.findMany({ where: { id: { in: [...new Set(b.shares.map((s) => s.sentById).filter((x): x is string => Boolean(x)))] } }, select: { id: true, name: true } }),
  ]);
  const senderName = (sid: string | null) => senders.find((s) => s.id === sid)?.name ?? "—";
  const copied = sp.copiar ? b.shares.find((s) => s.id === sp.copiar) : undefined;
  const copiedUrl = copied ? await brochureUrl(b.token, copied.id) : null;
  const opened = b.shares.filter((s) => s.openedAt).length;
  const byChannel = CHANNELS.map((c) => {
    const ss = b.shares.filter((s) => s.channel === c);
    return { label: SHARE_CHANNEL_LABELS[c], value: ss.length, hint: ss.length ? `${rate(ss.filter((s) => s.openedAt).length, ss.length)} abiertos` : undefined };
  }).filter((r) => r.value > 0);
  const share = (c: ShareChannel) => `/brochures/${b.id}/compartir?c=${c}`;
  const external = !b.isDemo ? { target: "_blank", rel: "noopener" } : {};

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/brochures" className="text-sm text-muted hover:underline">← Brochures</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{b.title}</h1>
        {b.isDemo && <DemoTag />}
        <Chip tone={BROCHURE_TONE[b.status]}>{BROCHURE_STATUS_LABELS[b.status]}</Chip>
        <span className="text-sm text-muted">
          {BROCHURE_KIND_LABELS[b.kind]}
          {b.property && (
            <>
              {" · "}
              <Link href={`/propiedades/${b.property.id}`} className="underline">{b.property.code}</Link> · {TYPE_LABELS[b.property.type]} · {b.property.comuna}
            </>
          )}
        </span>
      </div>
      {b.isDemo && <SimulatedNote what="Los envíos de este brochure se simulan: no se abre WhatsApp ni el correo con los contactos ficticios, pero el registro de envíos, aperturas y leads es el mismo que en producción." integration="WhatsApp, email y redes" />}
      {sp.error && ERRORS[sp.error] && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{ERRORS[sp.error]}</p>}
      {b.property && b.property.status !== "disponible" && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">La propiedad ya no está disponible: el brochure dejó de mostrarse a los contactos.</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Envíos" value={String(b.shares.length)} />
        <Kpi label="Envíos abiertos" value={String(opened)} sub={rate(opened, b.shares.length)} />
        <Kpi label="Visitas al brochure" value={String(b.views)} sub="incluye enlaces publicados en redes" />
        <Kpi label="Leads generados" value={String(b.leads.length)} sub={`${rate(b.leads.length, b.views)} de las visitas`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">1. Contenido y aprobación</h2>
            <a href={publicUrl} target="_blank" rel="noopener" className="btn-ghost text-sm">Ver brochure ↗</a>
          </div>
          <p className="text-xs text-muted">
            {b.kind === "captacion"
              ? "Se arma con los servicios, las zonas y parte de la cartera disponible de Bull Haus."
              : "Fotos, precio, superficies y características salen de la ficha aprobada de la propiedad; si la ficha cambia, el brochure se actualiza solo. La dirección exacta no aparece."}
          </p>
          {write && b.status !== "archivado" ? (
            <form action={updateBrochureAction} className="space-y-2">
              <input type="hidden" name="id" value={b.id} />
              <label className="block">
                <span className="label">Título</span>
                <input name="title" defaultValue={b.title} className="input w-full" maxLength={120} />
              </label>
              <label className="block">
                <span className="label">Bajada (opcional, la revisa administración)</span>
                <textarea name="intro" defaultValue={b.intro ?? ""} rows={2} maxLength={400} className="input w-full" />
              </label>
              <button className="btn-ghost text-sm">Guardar{b.status === "aprobado" ? " (vuelve a revisión)" : ""}</button>
            </form>
          ) : (
            b.intro && <p className="text-sm">{b.intro}</p>
          )}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {write && b.status === "borrador" && <form action={submitBrochureAction}><input type="hidden" name="id" value={b.id} /><button className="btn-primary text-sm">Enviar a revisión</button></form>}
            {approve && b.status === "en_revision" && <form action={approveBrochureAction}><input type="hidden" name="id" value={b.id} /><button className="btn-primary text-sm">Aprobar</button></form>}
            {approve && ["en_revision", "aprobado"].includes(b.status) && <form action={returnBrochureAction}><input type="hidden" name="id" value={b.id} /><button className="btn-ghost text-sm">Devolver a borrador</button></form>}
            {write && b.status !== "archivado" && <form action={archiveBrochureAction}><input type="hidden" name="id" value={b.id} /><button className="btn-ghost text-sm">Archivar</button></form>}
            {b.status === "en_revision" && !approve && <p className="text-sm text-muted">Esperando la aprobación de administración.</p>}
            {b.approvedAt && <p className="self-center text-xs text-muted">Aprobado el {formatDate(b.approvedAt)}</p>}
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-medium">2. Compartir</h2>
          {!shareable ? (
            <p className="text-sm text-muted">Disponible cuando el brochure esté aprobado.</p>
          ) : !write ? (
            <p className="text-sm text-muted">Tu rol no envía brochures.</p>
          ) : (
            <>
              <form action={`/brochures/${b.id}/compartir`} method="get" className="space-y-2" {...external}>
                <span className="label">A un contacto del pipeline ({KIND_LABELS[kind].toLowerCase()})</span>
                <select name="lead" className="input w-full" required defaultValue="">
                  <option value="" disabled>Elegir contacto</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.property ? ` · ${c.property.code}` : ""}
                      {c.email ? "" : " · sin email"}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button name="c" value="whatsapp" className="btn-primary text-sm">WhatsApp con mensaje</button>
                  <button name="c" value="email" className="btn-ghost text-sm">Email prearmado</button>
                </div>
                <p className="text-xs text-muted">Se abre tu WhatsApp o tu correo con el texto y el enlace listos; tú lo envías. Queda un compromiso de seguimiento en dos días.</p>
              </form>
              <div className="border-t border-line pt-4">
                <span className="label">En redes y grupos</span>
                <div className="flex flex-wrap gap-2">
                  <a href={share("whatsapp")} className="btn-ghost text-sm" {...external}>WhatsApp (elegir chat)</a>
                  <a href={share("instagram")} className="btn-ghost text-sm">Instagram</a>
                  <a href={share("facebook")} className="btn-ghost text-sm" {...external}>Facebook</a>
                  <a href={share("linkedin")} className="btn-ghost text-sm" {...external}>LinkedIn</a>
                  <a href={share("enlace")} className="btn-ghost text-sm">Copiar enlace</a>
                </div>
              </div>
              {copied && copiedUrl && (
                <CopyBox
                  title={copied.channel === "instagram" ? "Texto para la historia o el mensaje directo de Instagram" : "Enlace con medición"}
                  hint={copied.channel === "instagram" ? "Instagram no permite compartir enlaces desde la web: pega este texto en un mensaje directo o usa el sticker de enlace en una historia." : "Cada enlace mide sus propias aperturas."}
                  text={copied.channel === "instagram" ? brochureShareText(b.kind, b.title, copiedUrl) : copiedUrl}
                />
              )}
            </>
          )}
        </section>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="card p-5">
          <h2 className="font-medium">Envíos por canal</h2>
          <div className="mt-4">{byChannel.length ? <Bars rows={byChannel} /> : <p className="text-sm text-muted">Sin envíos todavía.</p>}</div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Leads que llegaron por este brochure</h2>
          {b.leads.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Todavía nadie dejó sus datos.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {b.leads.map((l) => (
                <li key={l.id} className="flex justify-between gap-2 py-2">
                  <Link href={`/leads/${l.id}`} className="hover:underline">{l.name}</Link>
                  <span className="text-xs text-muted">{SOURCE_LABELS[l.source]} · {formatDate(l.createdAt)} · {STAGE_LABELS[l.kind === "propietario" ? "captacion" : "demanda"][l.stage]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="font-medium">Historial de envíos</h2>
        <table className="mt-3 w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-2 font-semibold">Fecha</th>
              <th className="font-semibold">Canal</th>
              <th className="font-semibold">Contacto</th>
              <th className="font-semibold">Enviado por</th>
              <th className="font-semibold">Abierto</th>
              <th className="font-semibold">Aperturas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {b.shares.map((s) => (
              <tr key={s.id}>
                <td className="py-2 tabular-nums text-muted">{formatDateTimeCl(s.sentAt)}</td>
                <td>{SHARE_CHANNEL_LABELS[s.channel]}</td>
                <td>{s.lead ? <Link href={`/leads/${s.lead.id}`} className="hover:underline">{s.lead.name}</Link> : <span className="text-muted">Publicación o grupo</span>}</td>
                <td className="text-muted">{senderName(s.sentById)}</td>
                <td>{s.openedAt ? <Chip tone="green">{formatDateTimeCl(s.openedAt)}</Chip> : <Chip tone="gray">No</Chip>}</td>
                <td className="tabular-nums">{s.opens}</td>
              </tr>
            ))}
            {b.shares.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-muted">Sin envíos.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
