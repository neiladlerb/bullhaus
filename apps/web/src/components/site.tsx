import Link from "next/link";
import { formatPrice, TYPE_LABELS } from "@bullhaus/core";
import { displayCode, photoUrl, type PublicProperty } from "@/lib/api";

export const CONTACT = {
  whatsapp: "+56 9 9200 0211",
  whatsappUrl: "https://wa.me/56992000211",
  email: "contacto@bullhaus.cl",
  office: "San Sebastián 2957, Las Condes",
  mapsUrl: "https://maps.app.goo.gl/2QbtxZvy1AJU1VL59",
  instagram: "https://www.instagram.com/bullhaus_propiedades/",
  facebook: "https://www.facebook.com/BullHauspropiedades",
};

export function Logo({ light = false, size = 1 }: { light?: boolean; size?: number }) {
  const text = light ? "#ffffff" : "#3f3f3e";
  return (
    <span className="inline-flex flex-col" aria-label="Bull Haus Propiedades">
      <svg width={84 * size} height={54 * size} viewBox="0 0 96 62" aria-hidden="true">
        <path d="M4 14 L88 3 V58 H48 L42 46 L36 58" fill="none" stroke="#ea2b94" strokeWidth="2.5" />
        <text x="10" y="31" fontSize="17" fontWeight="500" letterSpacing="4" fill={text} fontFamily="Raleway, Arial, sans-serif">
          BULL
        </text>
        <text x="10" y="52" fontSize="17" fontWeight="500" letterSpacing="4" fill={text} fontFamily="Raleway, Arial, sans-serif">
          HAUS
        </text>
      </svg>
      <span className="mt-0.5 text-[7px] tracking-[0.5em]" style={{ color: text }}>
        PROPIEDADES
      </span>
    </span>
  );
}

const NAV = [
  { href: "/propiedades?operacion=venta", label: "Venta" },
  { href: "/propiedades?operacion=arriendo", label: "Arriendo" },
  { href: "/vender", label: "Vende o arrienda tu propiedad" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/#equipo", label: "Equipo" },
  { href: "/#contacto", label: "Contacto" },
];

export function Header({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-20 text-white" : "border-b border-line bg-white text-ink"}>
      <div className="wrap flex items-center justify-between gap-4 py-4">
        <Link href="/" aria-label="Inicio">
          <Logo light={overlay} size={0.85} />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="opacity-90 hover:opacity-100 hover:underline hover:underline-offset-8">
              {n.label}
            </Link>
          ))}
        </nav>
        <a href={CONTACT.whatsappUrl} className="btn-brand hidden sm:inline-flex" target="_blank" rel="noopener">
          WhatsApp
        </a>
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-full border border-current px-3 py-1.5 text-sm">Menú</summary>
          <nav className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-2 text-ink shadow-xl">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand">
                {n.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-coal text-white/80">
      <div className="wrap grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Intermediación y gestión inmobiliaria en el sector oriente de Santiago y en Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Contacto</p>
          <ul className="mt-3 space-y-2">
            <li>
              <a href={CONTACT.mapsUrl} target="_blank" rel="noopener" className="hover:text-white">
                {CONTACT.office}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="hover:text-white">
                {CONTACT.email}
              </a>
            </li>
            <li>
              <a href={CONTACT.whatsappUrl} target="_blank" rel="noopener" className="hover:text-white">
                {CONTACT.whatsapp}
              </a>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Síguenos</p>
          <ul className="mt-3 space-y-2">
            <li>
              <a href={CONTACT.instagram} target="_blank" rel="noopener" className="hover:text-white">
                Instagram @bullhaus_propiedades
              </a>
            </li>
            <li>
              <a href={CONTACT.facebook} target="_blank" rel="noopener" className="hover:text-white">
                Facebook
              </a>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-white">
                Privacidad y cookies
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="wrap border-t border-white/10 py-5 text-xs text-white/50">© {new Date().getFullYear()} Bull Haus Intermediación y Gestión Inmobiliaria</p>
    </footer>
  );
}

export function WhatsAppFloat() {
  return (
    <a
      href={CONTACT.whatsappUrl}
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
