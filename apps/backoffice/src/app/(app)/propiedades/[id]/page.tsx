import Link from "next/link";
import { notFound } from "next/navigation";
import { can, canEditProperty, CONTRACT_KIND_LABELS, CONTRACT_STATUS_LABELS, daysUntil, dealStageLabel, formatDate, formatPrice, seesOnlyOwnProperties } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
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
  const [legal, documents, contracts, deals] = await Promise.all([
    prisma.propertyLegal.findUnique({ where: { propertyId: property.id } }),
    prisma.propertyDocument.findMany({ where: { propertyId: property.id }, orderBy: { issuedAt: "desc" } }),
    can(user.role, "contracts.read") ? prisma.contract.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: "asc" }, select: { id: true, number: true, kind: true, status: true, createdAt: true } }) : [],
    can(user.role, "deals.read") ? prisma.deal.findMany({ where: { propertyId: property.id }, orderBy: { reservedAt: "asc" }, select: { id: true, number: true, stage: true, operation: true } }) : [],
  ]);

  return (
    <div className="max-w-5xl">
      <Link href="/propiedades" className="text-sm text-muted hover:underline">← Propiedades</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{property.code}</h1>
        <StatusChip status={property.status} />
        <span className="text-sm text-muted">{property.comuna}{property.sector ? `, ${property.sector}` : ""} · {formatPrice(Number(property.price), property.currency)}</span>
      </div>
      {sp.creada && <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Propiedad creada. Ahora agrega fotos y el mandato.</p>}
      {!editable && <p className="mt-4 text-sm text-muted">Solo lectura: no tienes permiso para editar esta propiedad.</p>}

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
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                    {m.isCover ? <span className="chip bg-brand text-white">Portada</span> : editable ? (
                      <form action={setCoverAction}>
                        <input type="hidden" name="propertyId" value={property.id} />
                        <input type="hidden" name="mediaId" value={m.id} />
                        <button className="text-muted hover:text-ink">Hacer portada</button>
                      </form>
                    ) : <span />}
                    {editable && (
                      <div className="flex gap-2">
                        {(["up", "down"] as const).map((dir) => (
                          <form key={dir} action={movePhotoAction}>
                            <input type="hidden" name="propertyId" value={property.id} />
                            <input type="hidden" name="mediaId" value={m.id} />
                            <input type="hidden" name="dir" value={dir} />
                            <button aria-label={dir === "up" ? "Mover antes" : "Mover después"} className="text-muted hover:text-ink" disabled={(dir === "up" && i === 0) || (dir === "down" && i === media.length - 1)}>
                              {dir === "up" ? "←" : "→"}
                            </button>
                          </form>
                        ))}
                        <form action={deletePhotoAction}>
                          <input type="hidden" name="propertyId" value={property.id} />
                          <input type="hidden" name="mediaId" value={m.id} />
                          <button className="text-red-700 hover:underline">Borrar</button>
                        </form>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {editable && <PhotoUpload propertyId={property.id} />}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 font-medium">Ficha</h2>
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
                  <span className={`chip ${d < 0 ? "bg-red-100 text-red-800" : d <= 15 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>
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
        <h2 className="mb-1 font-medium">
          Legal y contratos
          {legal?.isDemo && <DemoTag />}
        </h2>
        <p className="mb-4 text-xs text-muted">Datos de los certificados (no de la ficha comercial), confirmados por una persona. Con ellos se arman los contratos.</p>
        {legal ? (
          <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3"><dt className="text-muted">Dirección según título</dt><dd className="text-right">{legal.address}{legal.unit ? `, ${legal.unit}` : ""}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Inscripción</dt><dd className="text-right">fs. {legal.fojas} N° {legal.registryNumber} de {legal.registryYear}, CBR {legal.conservador}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Rol de avalúo</dt><dd>{legal.rolAvaluo}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Avalúo fiscal</dt><dd className="tabular-nums">{formatPrice(legal.avaluoFiscalClp, "CLP")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Propietario inscrito</dt><dd className="text-right">{legal.registeredOwners}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Gravámenes</dt><dd className="text-right">{legal.liens ?? "No registra"}</dd></div>
            <div className="flex justify-between gap-3 sm:col-span-2"><dt className="text-muted">Certificados cargados</dt><dd className="text-right">{documents.map((d) => `${DOC_LABELS[d.kind] ?? d.kind} (${formatDate(d.issuedAt)})`).join(" · ") || "—"}</dd></div>
          </dl>
        ) : (
          <p className="text-sm text-muted">Faltan los certificados de la propiedad: sin ellos no se generan contratos.</p>
        )}
        {(contracts.length > 0 || deals.length > 0) && (
          <ul className="mt-4 divide-y divide-line border-t border-line text-sm">
            {contracts.map((c) => (
              <li key={c.id} className="flex justify-between py-2">
                <Link href={`/contratos/${c.id}`} className="hover:underline">{CONTRACT_KIND_LABELS[c.kind]} N° {c.number}</Link>
                <span className="text-xs text-muted">{formatDate(c.createdAt)} · {CONTRACT_STATUS_LABELS[c.status]}</span>
              </li>
            ))}
            {deals.map((d) => (
              <li key={d.id} className="flex justify-between py-2">
                <Link href={`/operaciones/${d.id}`} className="hover:underline">Operación {d.number}</Link>
                <span className="text-xs text-muted">{dealStageLabel(d.stage, d.operation)}</span>
              </li>
            ))}
          </ul>
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
