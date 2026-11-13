import type { Metadata } from "next";
import Link from "next/link";
import { inZone, SALES_PROCESS, TYPE_LABELS, whatsappUrl } from "@bullhaus/core";
import { ContactForm } from "@/components/contact-form";
import { ProcessCarousel } from "@/components/process-carousel";
import { Header, PropertyCard, SocialBand } from "@/components/site";
import { getBrand, getIndicators, getProperties, photoUrl } from "@/lib/api";
import { agencyJsonLd, JsonLd } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: "/" } };


const initials = (n: string) =>
  n
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export default async function Home() {
  const [all, indicators, brand] = await Promise.all([getProperties(), getIndicators(), getBrand()]);
  const t = brand.texts;
  const [titleBefore, titleAfter] = t.heroHighlight && t.heroTitle.includes(t.heroHighlight) ? t.heroTitle.split(t.heroHighlight, 2) : [t.heroTitle, null];
  const featured = [...all].filter((p) => p.photos.length).sort((a, b) => (a.currency === b.currency ? b.price - a.price : a.currency === "UF" ? -1 : 1));
  const venta = all.filter((p) => p.operation === "venta").length;
  const arriendo = all.filter((p) => p.operation === "arriendo").length;
  const comunas = [...new Set(all.map((p) => p.comuna))].sort((a, b) => a.localeCompare(b, "es"));
  const types = [...new Set(all.map((p) => p.type))];
  const picks = [...featured.filter((p) => p.operation === "venta").slice(0, 3), ...featured.filter((p) => p.operation === "arriendo").slice(0, 3)];

  return (
    <>
      <section className="relative isolate flex min-h-[88vh] items-end overflow-hidden bg-coal text-white">
        {/* Foto fija de la cartera: la portada nunca queda en negro aunque la API no responda. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.heroImage} alt="" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-black/35" />
        <JsonLd data={agencyJsonLd(brand)} />
        <Header overlay />
        <div className="wrap pb-14 pt-40">
          <p className="eyebrow text-white/90">{t.heroEyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-light leading-tight md:text-6xl">
            {titleBefore}
            {titleAfter !== null && (
              <>
                <span className="font-semibold">{t.heroHighlight}</span>
                {titleAfter}
              </>
            )}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">{t.heroSubtitle}</p>

          <form action="/propiedades" className="mt-8 grid max-w-4xl gap-2 rounded-2xl bg-white p-2 text-ink shadow-2xl sm:grid-cols-[1fr_1fr_1fr_auto]">
            <select name="operacion" className="field border-0" aria-label="Operación" defaultValue="venta">
              <option value="venta">Comprar ({venta})</option>
              <option value="arriendo">Arrendar ({arriendo})</option>
            </select>
            <select name="tipo" className="field border-0" aria-label="Tipo de propiedad" defaultValue="">
              <option value="">Todos los tipos</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select name="comuna" className="field border-0" aria-label="Comuna" defaultValue="">
              <option value="">Todas las comunas</option>
              {comunas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button className="btn-brand rounded-xl px-8">Buscar</button>
          </form>
          <p className="mt-4 text-sm text-white/70">
            ¿Tienes una propiedad?{" "}
            <Link href="/vender" className="font-semibold text-white underline underline-offset-4">
              Pide una valorización
            </Link>
          </p>
        </div>
      </section>

      <section className="wrap py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Destacadas</p>
            <h2 className="mt-2 text-3xl font-light md:text-4xl">Propiedades seleccionadas</h2>
          </div>
          <Link href="/propiedades" className="btn-line text-coal">
            Ver las {all.length} propiedades
          </Link>
        </div>
        {picks.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((p) => (
              <PropertyCard key={p.code} p={p} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-muted">Estamos actualizando nuestra cartera. Escríbenos por WhatsApp y te contamos qué tenemos disponible.</p>
        )}
      </section>

      <section className="wrap grid gap-6 pb-20 md:grid-cols-2">
        {brand.zones.map((z, i) => {
          const zp = featured.filter((p) => inZone(brand.zones, z.key, p.comuna));
          const img = zp[i === 0 ? 1 : 0]?.photos[0];
          return (
            <Link key={z.key} href={`/propiedades?zona=${z.key}`} className="group relative isolate flex aspect-[16/10] items-end overflow-hidden rounded-3xl bg-coal p-8 text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img ? photoUrl(img.md) : (z.image ?? t.heroImage)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 to-transparent" />
              <div>
                <h3 className="text-2xl font-semibold">{z.name}</h3>
                <p className="mt-1 text-white/80">{z.detail}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section id="servicios" className="bg-sand py-20">
        <div className="wrap">
          <p className="eyebrow">Servicios</p>
          <div className="mt-6 grid gap-x-16 gap-y-12 border-t border-coal/15 pt-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-light md:text-4xl">Venta y arriendo</h2>
              <p className="mt-4 max-w-lg leading-relaxed text-muted">
                Casas, departamentos, oficinas, terrenos y parcelas en el sector oriente de Santiago y la V Región costa. Un corredor lleva tu propiedad desde la valorización hasta la entrega de llaves.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
                <Link href="/propiedades?operacion=venta" className="underline underline-offset-4">Propiedades en venta</Link>
                <Link href="/propiedades?operacion=arriendo" className="underline underline-offset-4">Propiedades en arriendo</Link>
                <Link href="/vender" className="underline underline-offset-4">Pedir una valorización</Link>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-light md:text-4xl">Asesoría en la compra</h2>
              <p className="mt-4 max-w-lg leading-relaxed text-muted">
                Para inversión o para vivir. Te ayudamos a concretar la mejor opción: buscamos contigo, revisamos los documentos de la propiedad y te acompañamos en la oferta, la promesa y la escritura.
              </p>
              <a href="#contacto" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">Conversemos</a>
            </div>
          </div>
        </div>
      </section>

      <section id="como-vendemos" className="wrap py-20">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">Cómo vendemos tu propiedad</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-light md:text-4xl">
              Somos tecnología de punta para lograr <span className="font-semibold">todos tus objetivos</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted">Nuestra experiencia y conocimiento, aplicados en tecnología a tu servicio.</p>
          </div>
          <dl className="flex flex-wrap gap-x-10 gap-y-4 lg:justify-end">
            {indicators.venta && (
              <div>
                <dt className="text-sm text-muted">Días promedio en vender</dt>
                <dd className="text-4xl font-light tabular-nums">{indicators.venta.avgDays}</dd>
              </div>
            )}
            {indicators.arriendo && (
              <div>
                <dt className="text-sm text-muted">Días promedio en arrendar</dt>
                <dd className="text-4xl font-light tabular-nums">{indicators.arriendo.avgDays}</dd>
              </div>
            )}
            {indicators.closedLast12m >= 5 && (
              <div>
                <dt className="text-sm text-muted">Operaciones en 12 meses</dt>
                <dd className="text-4xl font-light tabular-nums">{indicators.closedLast12m}</dd>
              </div>
            )}
            {all.length > 0 && (
              <div>
                <dt className="text-sm text-muted">Propiedades disponibles</dt>
                <dd className="text-4xl font-light tabular-nums">{all.length}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted">Corredores desde</dt>
              <dd className="text-4xl font-light tabular-nums">2012</dd>
            </div>
          </dl>
        </div>
        {(indicators.venta || indicators.arriendo) && (
          <p className="mt-3 text-xs text-muted lg:text-right">Días desde que la propiedad sale al mercado hasta la reserva, operaciones de los últimos 12 meses.</p>
        )}
        <div className="mt-10">
          <ProcessCarousel steps={SALES_PROCESS} />
        </div>
      </section>

      <section className="bg-coal py-20 text-white">
        <div className="wrap grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Propietarios</p>
            <h2 className="mt-2 text-3xl font-light md:text-4xl">¿Quieres vender o arrendar tu propiedad?</h2>
            <p className="mt-4 text-white/75">{t.ownerPitch}</p>
            <Link href="/vender" className="btn-brand mt-6">
              Pedir valorización
            </Link>
          </div>
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <ContactForm kind="propietario" brandName={brand.shortName} dark submitLabel="Quiero que me contacten" messagePlaceholder="Tipo de propiedad, comuna y si quieres vender o arrendar" />
          </div>
        </div>
      </section>

      <section id="nosotros" className="wrap grid gap-10 py-20 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Quiénes somos</p>
          <h2 className="mt-2 text-3xl font-light md:text-4xl">{t.aboutTitle}</h2>
        </div>
        <div className="space-y-4 leading-relaxed text-muted">
          {t.aboutParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {brand.team.length > 0 && (
      <section id="equipo" className="bg-sand py-20">
        <div className="wrap">
          <p className="eyebrow">Equipo</p>
          <h2 className="mt-2 text-3xl font-light md:text-4xl">Nuestros corredores</h2>
          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
            {brand.team.map((t) => (
              <div key={t.email} className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
                <div className="flex aspect-[4/5] items-center justify-center bg-coal">
                  {t.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photo} alt={t.name} loading="lazy" className="h-full w-full object-cover object-top" />
                  ) : (
                    <span className="text-4xl font-light tracking-widest text-white">{initials(t.name)}</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold leading-tight">{t.name}</p>
                  <p className="mt-1 text-xs text-muted">{t.role}</p>
                  <a href={`mailto:${t.email}`} className="mt-2 block truncate text-xs text-brand hover:underline">
                    {t.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      <SocialBand />

      <section id="contacto" className="wrap grid gap-12 py-20 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Contacto</p>
          <h2 className="mt-2 text-3xl font-light md:text-4xl">Conversemos</h2>
          <ul className="mt-6 space-y-3 text-sm">
            {brand.contact.office && (
              <li>
                <span className="block text-xs text-muted">Oficina</span>
                {brand.contact.mapsUrl ? (
                  <a href={brand.contact.mapsUrl} target="_blank" rel="noopener" className="hover:underline">
                    {brand.contact.office}
                  </a>
                ) : (
                  brand.contact.office
                )}
              </li>
            )}
            {brand.contact.whatsapp && (
              <li>
                <span className="block text-xs text-muted">WhatsApp</span>
                <a href={whatsappUrl(brand.contact.whatsapp)} target="_blank" rel="noopener" className="hover:underline">
                  {brand.contact.whatsapp}
                </a>
              </li>
            )}
            {brand.contact.email && (
              <li>
                <span className="block text-xs text-muted">Email</span>
                <a href={`mailto:${brand.contact.email}`} className="hover:underline">
                  {brand.contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>
        <div className="rounded-3xl bg-sand p-6 md:p-8">
          <ContactForm kind="comprador" brandName={brand.shortName} showKind />
        </div>
      </section>
    </>
  );
}
