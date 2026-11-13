import Link from "next/link";
import { formatPrice, TYPE_LABELS, whatsappUrl, type Brand } from "@bullhaus/core";
import { BACKOFFICE_URL, displayCode, getBrand, photoUrl, type PublicProperty } from "@/lib/api";

/** Acceso de corredores y equipo al back office. */
export const BACKOFFICE_LOGIN = `${BACKOFFICE_URL}/login`;

/** Logo de la corredora: su imagen si la cargó, o un logotipo con su nombre en una o más líneas. */
export function Logo({ brand, light = false, size = 1 }: { brand: Brand; light?: boolean; size?: number }) {
  const text = light ? "#ffffff" : brand.colors.coal;
  if (brand.logo.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logo.imageUrl} alt={brand.name} style={{ height: 54 * size }} className={light ? "w-auto brightness-0 invert" : "w-auto"} />;
  }
  const lines = brand.logo.lines;
  const height = 20 + lines.length * 21;
  return (
    <span className="inline-flex flex-col" aria-label={brand.name}>
      <svg width={84 * size} height={(height - 8) * size} viewBox={`0 0 96 ${height}`} aria-hidden="true">
        <path d={`M4 14 L88 3 V${height - 4} H48 L42 ${height - 16} L36 ${height - 4}`} fill="none" stroke={brand.colors.brand} strokeWidth="2.5" />
        {lines.map((l, i) => (
          <text key={i} x="10" y={31 + i * 21} fontSize="17" fontWeight="500" letterSpacing="4" fill={text} fontFamily="Raleway, Arial, sans-serif">
            {l}
          </text>
        ))}
      </svg>
      {brand.logo.subtitle && (
        <span className="mt-0.5 text-[7px] tracking-[0.5em]" style={{ color: text }}>
          {brand.logo.subtitle}
        </span>
      )}
    </span>
  );
}

const NAV = [
  { href: "/propiedades?operacion=venta", label: "Venta" },
  { href: "/propiedades?operacion=arriendo", label: "Arriendo" },
  { href: "/vender", label: "Vende o arrienda tu propiedad" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/#como-vendemos", label: "Cómo vendemos" },
  { href: "/#equipo", label: "Equipo" },
  { href: "/#contacto", label: "Contacto" },
];

export async function Header({ overlay = false }: { overlay?: boolean }) {
  const brand = await getBrand();
  const nav = NAV.filter((n) => n.href !== "/#equipo" || brand.team.length > 0);
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-20 text-white" : "border-b border-line bg-white text-ink"}>
      <div className="wrap flex items-center justify-between gap-4 py-4">
        <Link href="/" aria-label="Inicio">
          <Logo brand={brand} light={overlay} size={0.85} />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="opacity-90 hover:opacity-100 hover:underline hover:underline-offset-8">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 sm:flex">
          <SocialIcons brand={brand} className="hidden xl:inline-flex" />
          <a href={BACKOFFICE_LOGIN} className="text-sm font-medium opacity-80 hover:opacity-100 hover:underline hover:underline-offset-8" rel="nofollow">
            Ingreso corredores
          </a>
          {brand.contact.whatsapp && (
            <a href={whatsappUrl(brand.contact.whatsapp)} className="btn-brand inline-flex" target="_blank" rel="noopener">
              WhatsApp
            </a>
          )}
        </div>
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-full border border-current px-3 py-1.5 text-sm">Menú</summary>
          <nav className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-2 text-ink shadow-xl">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand">
                {n.label}
              </Link>
            ))}
            <a href={BACKOFFICE_LOGIN} rel="nofollow" className="mt-1 block rounded-lg border-t border-line px-3 py-2 text-sm text-muted hover:bg-sand">
              Ingreso corredores
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}

export async function Footer() {
  const brand = await getBrand();
  return (
    <footer className="bg-coal text-white/80">
      <div className="wrap grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo brand={brand} light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{brand.description}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Contacto</p>
          <ul className="mt-3 space-y-2">
            {brand.contact.office && (
              <li>
                {brand.contact.mapsUrl ? (
                  <a href={brand.contact.mapsUrl} target="_blank" rel="noopener" className="hover:text-white">
                    {brand.contact.office}
                  </a>
                ) : (
                  brand.contact.office
                )}
              </li>
            )}
            {brand.contact.email && (
              <li>
                <a href={`mailto:${brand.contact.email}`} className="hover:text-white">
                  {brand.contact.email}
                </a>
              </li>
            )}
            {brand.contact.whatsapp && (
              <li>
                <a href={whatsappUrl(brand.contact.whatsapp)} target="_blank" rel="noopener" className="hover:text-white">
                  {brand.contact.whatsapp}
                </a>
              </li>
            )}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Síguenos</p>
          <ul className="mt-3 space-y-2">
            {socialLinks(brand).map((s) => (
              <li key={s.key}>
                <a href={s.url} target="_blank" rel="noopener" className="hover:text-white">
                  {s.label} {s.handle}
                </a>
              </li>
            ))}
            <li>
              <Link href="/privacidad" className="hover:text-white">
                Privacidad y cookies
              </Link>
            </li>
            <li>
              <a href={BACKOFFICE_LOGIN} rel="nofollow" className="hover:text-white">
                Ingreso corredores (back office)
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="wrap border-t border-white/10 py-5 text-xs text-white/50">© {new Date().getFullYear()} {brand.legalName}</p>
    </footer>
  );
}

const IG_PATH =
  "M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.1a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4zm0 11a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm6.9-11.3a1.6 1.6 0 1 1-3.1 0 1.6 1.6 0 0 1 3.1 0z";
const FB_PATH = "M13.5 21.9v-8h2.7l.4-3.1h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H7.6v3.1h2.8v8h3.1z";

const LI_PATH = "M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.5V9h3.6v11.5z";

/** Redes de la corredora que tienen enlace cargado en su ficha. */
export function socialLinks(brand: Brand) {
  const all = [
    { key: "instagram", label: "Instagram", data: brand.social.instagram, path: IG_PATH, color: "bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]" },
    { key: "facebook", label: "Facebook", data: brand.social.facebook, path: FB_PATH, color: "bg-[#1877f2]" },
    { key: "linkedin", label: "LinkedIn", data: brand.social.linkedin, path: LI_PATH, color: "bg-[#0a66c2]" },
  ];
  return all.flatMap((s) => (s.data ? [{ key: s.key, label: s.label, url: s.data.url, handle: s.data.handle, path: s.path, color: s.color }] : []));
}

/** Íconos de redes. Son enlaces simples: no cargan scripts de Meta (las etiquetas de publicidad esperan al consentimiento de cookies). */
export function SocialIcons({ brand, className = "" }: { brand: Brand; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {socialLinks(brand).map((s) => (
        <a key={s.key} href={s.url} target="_blank" rel="noopener" aria-label={`${s.label} de ${brand.shortName}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-current/40 opacity-85 transition hover:opacity-100">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
            <path d={s.path} />
          </svg>
        </a>
      ))}
    </span>
  );
}

export async function SocialBand() {
  const brand = await getBrand();
  const links = socialLinks(brand);
  if (!links.length) return null;
  return (
    <section className="py-16">
      <div className="wrap flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <p className="eyebrow text-brand">Síguenos</p>
          <h2 className="mt-2 text-3xl font-light">
            Propiedades nuevas, recorridos y consejos <span className="font-semibold">cada semana</span>
          </h2>
          <p className="mt-2 max-w-xl text-muted">Publicamos primero en nuestras redes. También puedes escribirnos por mensaje directo.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {links.map((s) => (
            <a key={s.key} href={s.url} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl bg-sand px-5 py-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${s.color}`}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className="block text-sm text-muted">{s.handle}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function WhatsAppFloat() {
  const brand = await getBrand();
  if (!brand.contact.whatsapp) return null;
  return (
    <a
      href={whatsappUrl(brand.contact.whatsapp)}
      target="_blank"
      rel="noopener"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition hover:scale-105"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.1 1.3 15.1 0 12 0 5.4 0 .1 5.3.1 11.9c0 2.1.6 4.2 1.6 6L0 24l6.3-1.6c1.8 1 3.8 1.5 5.7 1.5 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.5-8.4z" />
      </svg>
    </a>
  );
}

export function priceLabel(p: Pick<PublicProperty, "price" | "currency" | "operation">) {
  return formatPrice(p.price, p.currency) + (p.operation === "arriendo" ? " / mes" : "");
}

export function specs(p: PublicProperty): string[] {
  const s: string[] = [];
  if (p.bedrooms) s.push(`${p.bedrooms} dorm.`);
  if (p.bathrooms) s.push(`${p.bathrooms} ${p.bathrooms === 1 ? "baño" : "baños"}`);
  if (p.m2Useful) s.push(`${p.m2Useful.toLocaleString("es-CL")} m² ${p.type === "casa" ? "const." : "útiles"}`);
  if (p.m2Land) s.push(`${p.m2Land.toLocaleString("es-CL")} m² terreno`);
  return s;
}

export function PropertyCard({ p }: { p: PublicProperty }) {
  const cover = p.photos[0];
  return (
    <Link href={`/propiedades/${p.code}`} className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover.md)} alt={`${TYPE_LABELS[p.type]} en ${p.comuna}`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold capitalize text-ink">{p.operation}</span>
        {p.photoCount > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">{p.photoCount} fotos</span>}
      </div>
      <div className="p-4">
        <p className="text-xs text-muted">
          {TYPE_LABELS[p.type]} · {p.comuna} · Cód. {displayCode(p.code)}
        </p>
        <p className="mt-1 line-clamp-1 font-semibold">{p.headline ?? `${TYPE_LABELS[p.type]} en ${p.comuna}`}</p>
        <p className="mt-2 text-lg font-bold text-coal">{priceLabel(p)}</p>
        <p className="mt-1 text-sm text-muted">{specs(p).join(" · ")}</p>
      </div>
    </Link>
  );
}
