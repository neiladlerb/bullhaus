import Link from "next/link";
import { UfCalculator } from "@bullhaus/ui/uf-calculator";
import { formatPrice, TYPE_LABELS, whatsappUrl, type Brand } from "@bullhaus/core";
import { BACKOFFICE_URL, displayCode, getBrand, photoUrl, type PublicProperty } from "@/lib/api";
import { getUf } from "@/lib/uf";

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

// Cinco accesos como máximo (skill diseno-bullhaus, web.md). Servicios y Equipo siguen en el inicio y en el
// menú del celular; redes e "Ingreso corredores" van al pie y al menú, no a la barra.
const NAV = [
  { href: "/propiedades?operacion=venta", label: "Comprar" },
  { href: "/propiedades?operacion=arriendo", label: "Arrendar" },
  { href: "/vender", label: "Vender" },
  { href: "/#como-vendemos", label: "Cómo vendemos" },
  { href: "/#contacto", label: "Contacto" },
];
const MORE = [
  { href: "/#servicios", label: "Servicios" },
  { href: "/#equipo", label: "Equipo" },
];

export async function Header({ overlay = false }: { overlay?: boolean }) {
  const brand = await getBrand();
  const more = MORE.filter((n) => n.href !== "/#equipo" || brand.team.length > 0);
  // Botones de la barra: todos del mismo ancho y alto, en una sola línea. Sobre la foto del inicio van en
  // carbón semitransparente para que se lean sobre cualquier imagen; en el resto de páginas, con borde.
  const item = overlay
    ? "border border-white/25 bg-black/55 text-white backdrop-blur-sm hover:bg-black/75"
    : "border border-line-strong bg-white text-ink hover:bg-paper";
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-20 text-white" : "border-b border-line bg-white text-ink"}>
      <div className="wrap flex items-center justify-between gap-4 py-4">
        <Link href="/" aria-label="Inicio" className="shrink-0">
          <Logo brand={brand} light={overlay} size={0.85} />
        </Link>
        <nav aria-label="Principal" className="hidden grid-flow-col gap-2 [grid-auto-columns:minmax(0,1fr)] lg:grid">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`flex h-11 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${item}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {brand.contact.whatsapp && (
            <a href={whatsappUrl(brand.contact.whatsapp)} className="btn hidden h-11 bg-whatsapp-dark px-5 text-white hover:brightness-110 sm:inline-flex" target="_blank" rel="noopener">
              WhatsApp
            </a>
          )}
          <details className="relative lg:hidden">
            <summary className={`flex h-11 cursor-pointer list-none items-center rounded-full px-5 text-sm font-semibold ${item}`}>Menú</summary>
            <nav aria-label="Menú" className="absolute right-0 z-50 mt-2 w-64 rounded-[10px] bg-white p-2 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.12)]">
              {[...NAV, ...more].map((n) => (
                <Link key={n.href} href={n.href} className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-paper">
                  {n.label}
                </Link>
              ))}
              <a href={BACKOFFICE_LOGIN} rel="nofollow" className="mt-1 flex min-h-11 items-center rounded-md border-t border-line px-3 text-sm text-muted hover:bg-paper">
                Ingreso corredores
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

// Enlaces del pie: todos del mismo alto, 44 px en el celular (se tocan con el dedo) y 32 px en el computador.
const PIE_LINK = "inline-flex min-h-11 items-center hover:text-white md:min-h-8";

export async function Footer() {
  const [brand, uf] = await Promise.all([getBrand(), getUf()]);
  return (
    <footer className="bg-coal text-white/80">
      <div className="wrap grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo brand={brand} light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{brand.description}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Contacto</p>
          <ul className="mt-2">
            {brand.contact.office && (
              <li>
                {brand.contact.mapsUrl ? (
                  <a href={brand.contact.mapsUrl} target="_blank" rel="noopener" className={PIE_LINK}>
                    {brand.contact.office}
                  </a>
                ) : (
                  brand.contact.office
                )}
              </li>
            )}
            {brand.contact.email && (
              <li>
                <a href={`mailto:${brand.contact.email}`} className={PIE_LINK}>
                  {brand.contact.email}
                </a>
              </li>
            )}
            {brand.contact.whatsapp && (
              <li>
                <a href={whatsappUrl(brand.contact.whatsapp)} target="_blank" rel="noopener" className={PIE_LINK}>
                  {brand.contact.whatsapp}
                </a>
              </li>
            )}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Síguenos</p>
          <ul className="mt-2">
            {socialLinks(brand).map((s) => (
              <li key={s.key}>
                <a href={s.url} target="_blank" rel="noopener" className={PIE_LINK}>
                  {s.label} {s.handle}
                </a>
              </li>
            ))}
            <li>
              <Link href="/privacidad" className={PIE_LINK}>
                Privacidad y cookies
              </Link>
            </li>
            <li>
              <a href={BACKOFFICE_LOGIN} rel="nofollow" className={PIE_LINK}>
                Ingreso corredores (back office)
              </a>
            </li>
            <li>
              <UfCalculator uf={uf} shortcut label={uf ? `Calculadora UF (${Math.round(uf.value).toLocaleString("es-CL")})` : "Calculadora UF"} className={`${PIE_LINK} text-left hover:underline`} />
            </li>
          </ul>
        </div>
      </div>
      <p className="wrap border-t border-white/10 py-5 text-xs text-on-dark-muted">© {new Date().getFullYear()} {brand.legalName}</p>
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
          <h2 className="text-3xl font-light text-heading">Propiedades nuevas, recorridos y consejos cada semana</h2>
          <p className="mt-2 max-w-xl text-muted">Publicamos primero en nuestras redes. También puedes escribirnos por mensaje directo.</p>
        </div>
        {/* Todas las tarjetas del mismo ancho: grilla de columnas iguales, no del ancho de su texto. */}
        <div className="grid w-full shrink-0 gap-3 md:w-80">
          {links.map((s) => (
            <a key={s.key} href={s.url} target="_blank" rel="noopener" className="flex min-h-[72px] w-full items-center gap-3 rounded-[10px] border border-line bg-paper px-5 py-4 transition-colors hover:border-line-strong">
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
      // Único flotante de la web. Sube mientras el aviso de cookies está abierto (--cookie-offset lo fija consent.tsx).
      style={{ bottom: "calc(1.25rem + var(--cookie-offset, 0px))" }}
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_8px_24px_rgb(0_0_0/0.12)] hover:brightness-95" // diseno-ok: ícono de la marca WhatsApp sin texto
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.1 1.3 15.1 0 12 0 5.4 0 .1 5.3.1 11.9c0 2.1.6 4.2 1.6 6L0 24l6.3-1.6c1.8 1 3.8 1.5 5.7 1.5 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.5-8.4z" />
      </svg>
    </a>
  );
}

export function priceLabel(p: Pick<PublicProperty, "price" | "currency" | "operation">) {
  return formatPrice(p.price, p.currency) + (p.operation === "arriendo" ? " al mes" : "");
}

export function specs(p: PublicProperty): string[] {
  const s: string[] = [];
  if (p.bedrooms) s.push(`${p.bedrooms} dorm.`);
  if (p.bathrooms) s.push(`${p.bathrooms} ${p.bathrooms === 1 ? "baño" : "baños"}`);
  if (p.m2Useful) s.push(`${p.m2Useful.toLocaleString("es-CL")} m² ${p.type === "casa" ? "const." : "útiles"}`);
  if (p.m2Land) s.push(`${p.m2Land.toLocaleString("es-CL")} m² terreno`);
  return s;
}

/**
 * Título para la tarjeta. Los títulos importados de Convecta vienen como lista con separadores
 * ("1D I 1B I Vespucio I Metro…"): esos no se muestran tal cual y se arma "Departamento en Macul".
 */
export function cardTitle(p: Pick<PublicProperty, "headline" | "type" | "comuna">): string {
  const h = p.headline?.trim();
  const separators = h ? (h.match(/\s[I|]\s/g) ?? []).length : 0;
  return h && separators < 2 ? h : `${TYPE_LABELS[p.type]} en ${p.comuna}`;
}

// Orden de lectura de componentes.md (Tarjeta de propiedad): foto, precio, comuna, título, datos, código.
export function PropertyCard({ p }: { p: PublicProperty }) {
  const cover = p.photos[0];
  return (
    <Link href={`/propiedades/${p.code}`} className="block overflow-hidden rounded-[10px] border border-line bg-white transition-colors hover:border-line-strong">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-paper">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(cover.md)} alt={`${TYPE_LABELS[p.type]} en ${p.comuna}`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-muted">{TYPE_LABELS[p.type]}</span>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">{p.operation === "venta" ? "Venta" : "Arriendo"}</span>
        {p.photoCount > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">{p.photoCount} fotos</span>}
      </div>
      <div className="p-4">
        <p className="text-[22px] font-bold leading-7 text-coal">{priceLabel(p)}</p>
        <p className="mt-1 text-base font-semibold text-heading">{p.comuna}</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-text">{cardTitle(p)}</p>
        {specs(p).length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            {specs(p).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Código {displayCode(p.code)}</p>
      </div>
    </Link>
  );
}
