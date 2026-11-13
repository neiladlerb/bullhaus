import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice, TYPE_LABELS } from "@bullhaus/core";
import { ContactForm } from "@/components/contact-form";
import { CONTACT, Header, priceLabel, PropertyCard, specs } from "@/components/site";
import { displayCode, getProperties, getProperty, photoUrl } from "@/lib/api";

export const revalidate = 300;

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getProperty((await params).code);
  if (!p) return { title: "Propiedad no disponible" };
  const title = `${TYPE_LABELS[p.type]} en ${p.operation} en ${p.comuna} · ${priceLabel(p)}`;
  return { title, description: p.headline ?? title, alternates: { canonical: `/propiedades/${p.code}` }, openGraph: { title, images: p.photos[0] ? [photoUrl(p.photos[0].md)] : [] } };
}

export default async function PropertyPage({ params }: Params) {
  const { code } = await params;
  const p = await getProperty(code);
  if (!p) notFound();
  const similar = (await getProperties()).filter((o) => o.code !== p.code && o.operation === p.operation && (o.comuna === p.comuna || o.type === p.type)).slice(0, 3);
  const [main, ...rest] = p.photos;
  const wa = `${CONTACT.whatsappUrl}?text=${encodeURIComponent(`Hola, me interesa la propiedad código ${displayCode(p.code)}.`)}`;
  const facts: [string, string][] = [
    ["Operación", p.operation === "venta" ? "Venta" : "Arriendo"],
    ["Tipo", TYPE_LABELS[p.type]],
    ["Comuna", p.comuna],
    ...(p.sector ? [["Sector", p.sector] as [string, string]] : []),
    ...(p.bedrooms ? [["Dormitorios", String(p.bedrooms)] as [string, string]] : []),
    ...(p.bathrooms ? [["Baños", String(p.bathrooms)] as [string, string]] : []),
    ...(p.m2Useful ? [[p.type === "casa" ? "Superficie construida" : "Superficie útil", `${p.m2Useful.toLocaleString("es-CL")} m²`] as [string, string]] : []),
    ...(p.m2Land ? [["Terreno", `${p.m2Land.toLocaleString("es-CL")} m²`] as [string, string]] : []),
    ...(p.parking ? [["Estacionamientos", String(p.parking)] as [string, string]] : []),
    ...(p.storage ? [["Bodegas", String(p.storage)] as [string, string]] : []),
    ...(p.commonExpensesClp ? [["Gastos comunes", formatPrice(p.commonExpensesClp, "CLP")] as [string, string]] : []),
    ...Object.entries(p.details ?? {}),
  ];

  return (
    <>
      <Header />
      <main className="wrap py-8">
        <nav className="text-sm text-muted">
          <Link href={`/propiedades?operacion=${p.operation}`} className="hover:underline">
            {p.operation === "venta" ? "Venta" : "Arriendo"}
          </Link>{" "}
          / {p.comuna} / Cód. {displayCode(p.code)}
        </nav>

        <div className="mt-4 grid gap-2 md:grid-cols-4 md:grid-rows-2">
          {main && (
            <a href={photoUrl(main.lg)} target="_blank" rel="noopener" className="overflow-hidden rounded-2xl md:col-span-2 md:row-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(main.lg)} alt={`${TYPE_LABELS[p.type]} en ${p.comuna}`} className="aspect-[4/3] h-full w-full object-cover" />
            </a>
          )}
          {rest.slice(0, 4).map((ph, i) => (
            <a key={ph.md} href={photoUrl(ph.lg)} target="_blank" rel="noopener" className="hidden overflow-hidden rounded-2xl md:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(ph.md)} alt={`Foto ${i + 2}`} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition hover:scale-105" />
            </a>
          ))}
        </div>
        {rest.length > 4 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {rest.slice(4).map((ph, i) => (
              <a key={ph.md} href={photoUrl(ph.lg)} target="_blank" rel="noopener" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(ph.sm)} alt={`Foto ${i + 6}`} loading="lazy" className="h-24 w-32 rounded-lg object-cover" />
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <article>
            <p className="eyebrow">
              {TYPE_LABELS[p.type]} en {p.operation}
            </p>
            <h1 className="mt-2 text-3xl font-light md:text-4xl">{p.headline ?? `${TYPE_LABELS[p.type]} en ${p.comuna}`}</h1>
            <p className="mt-1 text-muted">
              {p.comuna} · Código {displayCode(p.code)}
            </p>
            <p className="mt-4 text-3xl font-bold text-coal">{priceLabel(p)}</p>
            <p className="mt-2 flex flex-wrap gap-2 text-sm">
              {specs(p).map((s) => (
                <span key={s} className="rounded-full bg-sand px-3 py-1">
                  {s}
                </span>
              ))}
            </p>

            {p.description && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold">Descripción</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-ink/85">
                  {p.description.split(/\n{2,}/).map((para, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {p.features.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold">Características</h2>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-lg font-semibold">Ficha</h2>
              <dl className="mt-3 grid gap-x-8 text-sm sm:grid-cols-2">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-line py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted">La dirección exacta se entrega al coordinar la visita.</p>
            </section>
          </article>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl bg-sand p-6">
              <p className="text-xs text-muted">Corredor a cargo</p>
              <p className="font-semibold">{p.broker.name}</p>
              <a href={wa} target="_blank" rel="noopener" className="btn mt-4 w-full bg-[#25d366] text-white hover:brightness-95">
                Consultar por WhatsApp
              </a>
              <p className="my-5 text-center text-xs text-muted">o déjanos tus datos</p>
              <ContactForm kind={p.operation === "venta" ? "comprador" : "arrendatario"} propertyCode={p.code} submitLabel="Quiero visitarla" messagePlaceholder="¿Cuándo te acomoda visitarla?" />
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-light">También te puede interesar</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <PropertyCard key={s.code} p={s} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
