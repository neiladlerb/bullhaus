import Link from "next/link";
import { TYPE_LABELS } from "@bullhaus/core";
import { ContactForm } from "@/components/contact-form";
import { CONTACT, Header, PropertyCard, SocialBand } from "@/components/site";
import { COAST, getProperties, photoUrl } from "@/lib/api";

export const revalidate = 300;

const SERVICES = [
  { title: "Intermediación", text: "Compra, venta y arriendo de casas, departamentos, oficinas, terrenos y parcelas, con acompañamiento de principio a fin." },
  { title: "Gestión inmobiliaria", text: "Administración y gestión de propiedades y proyectos en la Región Metropolitana y la V Región costa." },
  { title: "Asesoría", text: "Te acompañamos a evaluar, negociar y concretar cada decisión con información clara." },
  { title: "Valorizaciones", text: "Un corredor visita tu propiedad y te entrega una valorización para publicarla con un precio bien fundamentado." },
];

const TEAM = [
  { name: "Rodrigo Abbott Irarrázaval", role: "Socio · Broker inmobiliario", email: "rodrigo@bullhaus.cl", photo: "/equipo/rodrigo.jpg" },
  { name: "Alejandro Steinsapir Stitchkin", role: "Socio · Broker inmobiliario", email: "alejandro@bullhaus.cl", photo: "/equipo/alejandro.png" },
  { name: "Sandra Cáceres", role: "Broker inmobiliario", email: "sandra@bullhaus.cl", photo: "/equipo/sandra.png" },
  { name: "Manuel José Vial", role: "Broker inmobiliario V Región costa", email: "manuel@bullhaus.cl", photo: null },
  { name: "Santiago Andrés Krogh", role: "Broker", email: "santiago@bullhaus.cl", photo: "/equipo/santiago.jpg" },
];

const ZONES = [
  { name: "Sector oriente de Santiago", detail: "Las Condes, Vitacura, Lo Barnechea, Providencia y Ñuñoa" },
  { name: "V Región costa", detail: "Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar" },
];

const initials = (n: string) =>
  n
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export default async function Home() {
  const all = await getProperties();
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
        <img src="/hero-casa.webp" alt="" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-black/35" />
        <Header overlay />
        <div className="wrap pb-14 pt-40">
          <p className="eyebrow text-white/90">Intermediación y gestión inmobiliaria</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-light leading-tight md:text-6xl">
            Gestión inmobiliaria <span className="font-semibold">profesional</span>, de principio a fin
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Compra, venta y arriendo en el sector oriente de Santiago y la V Región costa, con un corredor que te acompaña en cada paso.
          </p>

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

      <section id="servicios" className="bg-sand py-20">
        <div className="wrap grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">Servicios</p>
            <h2 className="mt-2 text-3xl font-light md:text-4xl">Un acompañamiento profesional y humano</h2>
            <p className="mt-4 text-muted">
              Comprar, vender, arrendar, evaluar, desarrollar y negociar son desafíos importantes. Sabemos por experiencia que una propiedad también son sueños e historias.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SERVICES.map((s, i) => (
              <div key={s.title} className="rounded-2xl bg-white p-6 ring-1 ring-line">
                <span className="text-sm font-semibold text-brand">0{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap grid gap-6 py-20 md:grid-cols-2">
        {ZONES.map((z, i) => {
          const zp = featured.filter((p) => (i === 0 ? !COAST.includes(p.comuna) : COAST.includes(p.comuna)));
          const img = zp[i === 0 ? 1 : 0]?.photos[0];
          return (
            <Link key={z.name} href={i === 0 ? "/propiedades?zona=santiago" : "/propiedades?zona=costa"} className="group relative isolate flex aspect-[16/10] items-end overflow-hidden rounded-3xl bg-coal p-8 text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img ? photoUrl(img.md) : i === 0 ? "/zona-santiago.webp" : "/zona-costa.webp"} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 to-transparent" />
              <div>
                <h3 className="text-2xl font-semibold">{z.name}</h3>
                <p className="mt-1 text-white/80">{z.detail}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="bg-coal py-20 text-white">
        <div className="wrap grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Propietarios</p>
            <h2 className="mt-2 text-3xl font-light md:text-4xl">¿Quieres vender o arrendar tu propiedad?</h2>
            <p className="mt-4 text-white/75">
              Un corredor de Bull Haus visita tu propiedad, te entrega una valorización y te propone cómo publicarla. Trabajamos en el sector oriente de Santiago y en la V Región costa.
            </p>
            <Link href="/vender" className="btn-brand mt-6">
              Pedir valorización
            </Link>
          </div>
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <ContactForm kind="propietario" dark submitLabel="Quiero que me contacten" messagePlaceholder="Tipo de propiedad, comuna y si quieres vender o arrendar" />
          </div>
        </div>
      </section>

      <section id="nosotros" className="wrap grid gap-10 py-20 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Quiénes somos</p>
          <h2 className="mt-2 text-3xl font-light md:text-4xl">Experiencia desde 2012</h2>
        </div>
        <div className="space-y-4 leading-relaxed text-muted">
          <p>
            Bull Haus nace de combinar la experiencia de Steinsapir &amp; Stitchkin Propiedades, en el mercado desde 2012, con una visión de futuro: llevar a cada cliente un servicio
            personalizado, profesional, humano, transparente, ágil y de excelencia.
          </p>
          <p>
            Nos especializamos en corretaje e intermediación en el sector oriente de Santiago y en Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar. Lo complementamos con desarrollo y gestión
            inmobiliaria en toda la Región Metropolitana y la V Región costa.
          </p>
        </div>
      </section>

      <section id="equipo" className="bg-sand py-20">
        <div className="wrap">
          <p className="eyebrow">Equipo</p>
          <h2 className="mt-2 text-3xl font-light md:text-4xl">Nuestros corredores</h2>
          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
            {TEAM.map((t) => (
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

      <SocialBand />

      <section id="contacto" className="wrap grid gap-12 py-20 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Contacto</p>
          <h2 className="mt-2 text-3xl font-light md:text-4xl">Conversemos</h2>
          <ul className="mt-6 space-y-3 text-sm">
            <li>
              <span className="block text-xs text-muted">Oficina</span>
              <a href={CONTACT.mapsUrl} target="_blank" rel="noopener" className="hover:underline">
                {CONTACT.office}
              </a>
            </li>
            <li>
              <span className="block text-xs text-muted">WhatsApp</span>
              <a href={CONTACT.whatsappUrl} target="_blank" rel="noopener" className="hover:underline">
                {CONTACT.whatsapp}
              </a>
            </li>
            <li>
              <span className="block text-xs text-muted">Email</span>
              <a href={`mailto:${CONTACT.email}`} className="hover:underline">
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>
        <div className="rounded-3xl bg-sand p-6 md:p-8">
          <ContactForm kind="comprador" showKind />
        </div>
      </section>
    </>
  );
}
