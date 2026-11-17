import Link from "next/link";
import { notFound } from "next/navigation";
import { APPOINTMENT_KIND_LABELS, APPOINTMENT_STATUS_LABELS, formatWhen, localDayKey, milestoneRows, nextMilestone } from "@bullhaus/core";
import { setMilestoneAction } from "../../agenda/actions";
import { can, canEditProperty, CONTRACT_KIND_LABELS, CONTRACT_STATUS_LABELS, daysUntil, dealStageLabel, formatDate, formatPrice, seesOnlyOwnProperties } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { ConfirmSubmit } from "@bullhaus/ui/confirm-submit";
import { DemoTag } from "@/components/demo";
import { requireUser } from "@/lib/auth";

const DOC_LABELS: Record<string, string> = {
  dominio_vigente: "Dominio vigente",
  hipotecas_gravamenes: "Hipotecas y gravámenes",
  avaluo_fiscal: "Avalúo fiscal",
  deuda_contribuciones: "Deuda de contribuciones",
  titulo: "Título",
  recepcion_final: "Recepción final",
  numero: "Certificado de número",
};
import { propertyToFormValues } from "@/lib/form-values";
import { activeBrokers, getProperty } from "@/lib/properties";
import { StatusChip } from "@/components/status-chip";
import { PropertyForm } from "../property-form";
import { MandateForm, PhotoUpload } from "./panels";
import { deletePhotoAction, movePhotoAction, setCoverAction } from "../actions";

export default async function PropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.read");
  const { id } = await params;
  const sp = await searchParams;
  const property = await getProperty(user, id);
  if (!property) notFound();

  const editable = canEditProperty(user, property);
  const lock = seesOnlyOwnProperties(user.role);
  const brokers = lock ? [{ email: property.broker.email, name: property.broker.name }] : await activeBrokers(user.tenantId);
  const media = [...property.media].sort((a, b) => a.order - b.order);
  const [legal, documents, contracts, deals, milestones, upcoming, doneVisits] = await Promise.all([
    prisma.propertyLegal.findUnique({ where: { propertyId: property.id } }),
    prisma.propertyDocument.findMany({ where: { propertyId: property.id }, orderBy: { issuedAt: "desc" } }),
    can(user.role, "contracts.read") ? prisma.contract.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: "asc" }, select: { id: true, number: true, kind: true, status: true, createdAt: true } }) : [],
    can(user.role, "deals.read") ? prisma.deal.findMany({ where: { propertyId: property.id }, orderBy: { reservedAt: "asc" }, select: { id: true, number: true, stage: true, operation: true } }) : [],
    prisma.propertyMilestone.findMany({ where: { propertyId: property.id }, select: { key: true, doneAt: true, dueAt: true } }),
    prisma.appointment.findMany({
      where: { propertyId: property.id, status: { in: ["por_confirmar", "confirmada"] }, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 5,
      select: { id: true, kind: true, status: true, startsAt: true, contactName: true },
    }),
    prisma.appointment.count({ where: { propertyId: property.id, kind: "visita", status: "realizada" } }),
  ]);
  const milestoneList = milestoneRows(property.operation, milestones, {
    hasMandate: property.mandates.length > 0,
    hasCertificates: documents.length > 0,
    photoCount: property.media.length,
    publishedOnWeb: property.status === "disponible" && property.publishWeb,
    doneVisits,
  });
  const next = nextMilestone(milestoneList);
  const doneCount = milestoneList.filter((m) => m.doneAt).length;
  const dateInput = (d: Date | null) => (d ? localDayKey(d) : "");

  return (
    <div className="max-w-5xl">
      <Link href="/propiedades" className="text-sm text-muted hover:underline">← Propiedades</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{property.code}</h1>
        <StatusChip status={property.status} />
        <span className="text-sm text-muted">{property.comuna}{property.sector ? `, ${property.sector}` : ""} · {formatPrice(Number(property.price), property.currency)}</span>
      </div>
      {sp.creada && <p className="mt-4 rounded-md bg-success-soft px-4 py-3 text-sm text-success">Propiedad creada. Ahora agrega fotos y el mandato.</p>}
      {!editable && <p className="mt-4 text-sm text-muted">Solo lectura: no tienes permiso para editar esta propiedad.</p>}

      {/* Hitos hasta la venta o el arriendo: lo que falta hacer con la propiedad, en orden. Los automáticos salen de
          los datos (mandato, certificados, fotos, publicación, visitas); el resto lo marca el corredor. */}
      <section id="hitos" className="card mt-6 scroll-mt-6 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">Hitos hasta {property.operation === "arriendo" ? "el arriendo" : "la venta"}</h2>
          <p className="text-sm text-muted">{doneCount} de {milestoneList.length} listos</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuemin={0} aria-valuemax={milestoneList.length} aria-valuenow={doneCount} aria-label="Avance de los hitos">
          <div className="h-full rounded-full bg-success" style={{ width: `${(doneCount / milestoneList.length) * 100}%` }} />
        </div>
        {next && (
          <p className="mt-3 text-sm">
            <span className="font-semibold">Lo siguiente:</span> {next.label}
            {next.dueAt ? `, para el ${formatDate(next.dueAt)}` : ""}
          </p>
        )}
        <ol className="mt-4 divide-y divide-line text-sm">
          {milestoneList.map((m) => (
            <li key={m.key} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${m.doneAt ? "border-success bg-success text-white" : "border-line-strong bg-white"}`}>
                  {m.doneAt && (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  )}
                </span>
                <span>
                  <span className={m.doneAt ? "text-muted" : "font-semibold"}>{m.label}</span>
                  <span className="sr-only">{m.doneAt ? ", listo" : ", pendiente"}</span>
                  {m.auto && <span className="block text-xs text-muted">Se marca solo</span>}
                  {!m.auto && m.doneAt && <span className="block text-xs text-muted">Listo el {formatDate(m.doneAt)}</span>}
                </span>
              </span>
              {editable && !m.auto && (
                <span className="flex flex-wrap items-center gap-2">
                  {!m.doneAt && (
                    <form action={setMilestoneAction} className="flex items-center gap-2">
                      <input type="hidden" name="propertyId" value={property.id} />
                      <input type="hidden" name="key" value={m.key} />
                      <label className="sr-only" htmlFor={`due-${m.key}`}>Fecha límite de {m.label}</label>
                      <input id={`due-${m.key}`} name="dueAt" type="date" defaultValue={dateInput(m.dueAt)} className="input w-40" />
                      <button className="btn-ghost w-28">Fijar fecha</button>
                    </form>
                  )}
                  <form action={setMilestoneAction}>
                    <input type="hidden" name="propertyId" value={property.id} />
                    <input type="hidden" name="key" value={m.key} />
                    <input type="hidden" name="done" value={m.doneAt ? "0" : "1"} />
                    <button className={`${m.doneAt ? "btn-ghost" : "btn-primary"} w-28`}>{m.doneAt ? "Desmarcar" : "Marcar listo"}</button>
                  </form>
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Próximas citas</h3>
            <Link href="/agenda?nueva=1" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">Agendar en la agenda</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Sin citas agendadas.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line text-sm">
              {upcoming.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/agenda?dia=${localDayKey(a.startsAt)}`} className="hover:underline">
                    {APPOINTMENT_KIND_LABELS[a.kind]} el {formatWhen(a.startsAt)}
                    {a.contactName ? `, con ${a.contactName}` : ""}
                  </Link>
                  <span className="text-muted">{APPOINTMENT_STATUS_LABELS[a.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="mb-1 font-medium">Fotos</h2>
        <p className="mb-4 text-xs text-muted">Se guardan en tres tamaños. La portada es la primera que verán en la web y en los posts. No se retocan de forma que cambien la propiedad.</p>
        {media.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay fotos.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {media.map((m, i) => {
              const sizes = m.sizes as Record<string, string>;
              return (
                <li key={m.id} className="overflow-hidden rounded-md border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/media/${sizes.md ?? sizes.sm}`} alt={`Foto ${i + 1} de ${property.code}`} className="aspect-[4/3] w-full object-cover" />
                  {/* Portada arriba; orden a la izquierda y borrar a la derecha, separados, con objetivos de 44 px
                      en celular y confirmación antes de borrar (revisión UX 14/11/2026, B4). */}
                  <div className="px-2 pt-2 text-xs">
                    {m.isCover ? (
                      <span className="chip bg-brand-dark text-white">Portada</span>
                    ) : editable ? (
                      <form action={setCoverAction}>
                        <input type="hidden" name="propertyId" value={property.id} />
                        <input type="hidden" name="mediaId" value={m.id} />
                        <button className="min-h-11 font-semibold text-ink underline-offset-2 hover:underline md:min-h-8">Hacer portada</button>
                      </form>
                    ) : null}
                  </div>
                  {editable && (
                    <div className="flex items-center justify-between gap-2 px-1 pb-1">
                      <div className="flex">
                        {(["up", "down"] as const).map((dir) => (
                          <form key={dir} action={movePhotoAction}>
                            <input type="hidden" name="propertyId" value={property.id} />
                            <input type="hidden" name="mediaId" value={m.id} />
                            <input type="hidden" name="dir" value={dir} />
                            <button
                              aria-label={dir === "up" ? `Mover la foto ${i + 1} antes` : `Mover la foto ${i + 1} después`}
                              className="flex h-11 w-11 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink disabled:opacity-30 md:h-9 md:w-9"
                              disabled={(dir === "up" && i === 0) || (dir === "down" && i === media.length - 1)}
                            >
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d={dir === "up" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
                              </svg>
                            </button>
                          </form>
                        ))}
                      </div>
                      <form action={deletePhotoAction}>
                        <input type="hidden" name="propertyId" value={property.id} />
                        <input type="hidden" name="mediaId" value={m.id} />
                        <ConfirmSubmit
                          title={`¿Borrar la foto ${i + 1}?`}
                          consequence={m.isCover ? "Es la portada: la siguiente foto pasa a ser la portada. La foto borrada no se puede recuperar." : "La foto se borra de la ficha y de la web y no se puede recuperar."}
                          confirmLabel="Borrar foto"
                          aria-label={`Borrar la foto ${i + 1}`}
                          className="min-h-11 rounded-md px-2 text-xs font-semibold text-danger hover:bg-danger-soft md:min-h-9"
                        >
                          Borrar
                        </ConfirmSubmit>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {editable && <PhotoUpload propertyId={property.id} />}
      </section>

      <section className="card mt-6 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Ficha</h2>
          {editable && (
            <Link href={`/dictado?propiedad=${property.id}`} className="btn-ghost">
              Dictar cómo es
            </Link>
          )}
          {editable && (
            <Link href={`/tasaciones/nueva?propiedad=${property.id}`} className="btn-ghost">
              Tasar con comparables
            </Link>
          )}
        </div>
        <PropertyForm id={property.id} values={propertyToFormValues(property)} brokers={brokers} lockBroker={lock} readOnly={!editable} />
      </section>

      <section className="card mt-6 p-6">
        <h2 className="mb-1 font-medium">Mandatos (orden de corretaje)</h2>
        <p className="mb-4 text-xs text-muted">El back office avisa en el inicio 15 días antes de que venza.</p>
        {property.mandates.length === 0 ? (
          <p className="text-sm text-muted">Sin mandato registrado.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {property.mandates.map((m) => {
              const d = daysUntil(m.expiresAt);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <span className="font-medium">{m.owner.name}</span> <span className="text-muted">({m.owner.rut})</span>
                    <span className="block text-xs text-muted">
                      {m.exclusive ? "Exclusivo" : "No exclusivo"} · {Number(m.commissionPct).toLocaleString("es-CL")} % · firmado {formatDate(m.signedAt)} · vence {formatDate(m.expiresAt)}
                      {m.fileKey ? " · PDF cargado" : ""}
                    </span>
                  </span>
                  <span className={`chip ${d < 0 ? "bg-danger-soft text-danger" : d <= 15 ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
                    {d < 0 ? "Vencido" : d <= 15 ? `Vence en ${d} d` : "Vigente"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {editable && can(user.role, "mandates.write") && <MandateForm propertyId={property.id} />}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="mb-1 font-semibold">
          Legal y contratos
          {legal?.isDemo && <DemoTag />}
        </h2>
        <p className="text-sm text-muted">Datos de los certificados (no de la ficha comercial), confirmados por una persona. Con ellos se arman los contratos.</p>

        {/* Tres bloques con su título: datos del título, certificados y documentos. Cada dato con su etiqueta
            arriba y el valor abajo, en columnas parejas, en vez de pares a la izquierda y derecha que se cortaban. */}
        <h3 className="mt-5 text-sm font-semibold">Datos del título</h3>
        {legal ? (
          <dl className="mt-2 grid gap-x-6 gap-y-4 rounded-md bg-paper p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <dt className="text-xs text-muted">Dirección según título</dt>
              <dd className="mt-0.5 font-semibold">{legal.address}{legal.unit ? `, ${legal.unit}` : ""}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Propietario inscrito</dt>
              <dd className="mt-0.5 font-semibold">{legal.registeredOwners}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Inscripción</dt>
              <dd className="mt-0.5 font-semibold">Fs. {legal.fojas} N° {legal.registryNumber} de {legal.registryYear}</dd>
              <dd className="text-muted">CBR {legal.conservador}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Rol de avalúo</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{legal.rolAvaluo}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Avalúo fiscal</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatPrice(legal.avaluoFiscalClp, "CLP")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Gravámenes</dt>
              <dd className="mt-0.5 font-semibold">{legal.liens ?? "No registra"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">Faltan los datos del título: sin ellos no se generan contratos.</p>
        )}

        <h3 className="mt-6 text-sm font-semibold">
          Certificados ({documents.length} de {Object.keys(DOC_LABELS).length})
        </h3>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(DOC_LABELS).map(([kind, label]) => {
            const doc = documents.find((d) => d.kind === kind);
            return (
              <li key={kind} className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
                <span>{label}</span>
                {doc ? (
                  <span className="chip shrink-0 bg-success-soft text-success">Emitido {formatDate(doc.issuedAt)}</span>
                ) : (
                  <span className="chip shrink-0 bg-warning-soft text-warning">Falta</span>
                )}
              </li>
            );
          })}
        </ul>

        {(contracts.length > 0 || deals.length > 0) && (
          <>
            <h3 className="mt-6 text-sm font-semibold">Contratos y operaciones</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="border-b border-line text-left text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Documento</th>
                    <th className="w-32 py-2 pr-4 font-medium">Fecha</th>
                    <th className="w-40 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {contracts.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-4"><Link href={`/contratos/${c.id}`} className="font-semibold hover:underline">{CONTRACT_KIND_LABELS[c.kind]} N° {c.number}</Link></td>
                      <td className="py-2 pr-4 tabular-nums">{formatDate(c.createdAt)}</td>
                      <td className="py-2">{CONTRACT_STATUS_LABELS[c.status]}</td>
                    </tr>
                  ))}
                  {deals.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 pr-4"><Link href={`/operaciones/${d.id}`} className="font-semibold hover:underline">Operación {d.number}</Link></td>
                      <td className="py-2 pr-4 text-muted">–</td>
                      <td className="py-2">{dealStageLabel(d.stage, d.operation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 font-medium">Historial de precio</h2>
        <ul className="text-sm">
          {property.priceHistory.map((h) => (
            <li key={h.id} className="flex justify-between border-b border-line py-2 last:border-0">
              <span className="text-muted">{formatDate(h.changedAt)}</span>
              <span className="tabular-nums">{formatPrice(Number(h.price), h.currency)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
