// Borradores de publicaciones de Instagram. Los textos salen solo de la ficha aprobada
// y de la información pública de Bull Haus; nunca agregan cifras ni condiciones que no
// estén ahí (CLAUDE.md). Todo queda en borrador hasta que una persona lo apruebe.
import { formatPrice } from "./format";
import { TYPE_LABELS, type Currency, type Operation, type PropertyType } from "./property";

export interface PostDraft {
  format: "post" | "carrusel" | "reel" | "historia";
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
}

export interface ListingForPost {
  code: string;
  operation: Operation;
  type: PropertyType;
  comuna: string;
  headline?: string | null;
  price: number;
  currency: Currency;
  m2Useful?: number | null;
  m2Land?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  features?: string[];
}

/** Datos públicos de Bull Haus (bullhaus.cl). Única fuente para las piezas de captación. */
export const BULLHAUS_PUBLIC = {
  name: "Bull Haus",
  whatsapp: "+56 9 9200 0211",
  instagram: "@bullhaus_propiedades",
  office: "San Sebastián 2957, Las Condes",
  since: 2012,
  services: ["Intermediación", "Gestión inmobiliaria", "Asesoría", "Valorizaciones"],
  zones: ["Sector oriente de Santiago", "Zapallar", "Papudo", "Cachagua", "Maitencillo", "Viña del Mar"],
} as const;

const tag = (s: string) =>
  "#" +
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""))
    .replace(/^./, (c) => c.toUpperCase());

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const m2 = (n: number) => `${n.toLocaleString("es-CL")} m²`;

/** Líneas de datos de la ficha, solo las que la ficha tiene. */
export function listingFacts(l: ListingForPost): string[] {
  const facts: string[] = [];
  if (l.bedrooms) facts.push(plural(l.bedrooms, "dormitorio", "dormitorios"));
  if (l.bathrooms) facts.push(plural(l.bathrooms, "baño", "baños"));
  if (l.m2Useful) facts.push(`${m2(l.m2Useful)} ${l.type === "casa" ? "construidos" : "útiles"}`);
  if (l.m2Land) facts.push(`${m2(l.m2Land)} de terreno`);
  if (l.parking) facts.push(plural(l.parking, "estacionamiento", "estacionamientos"));
  return facts;
}

export function listingPost(l: ListingForPost, format: PostDraft["format"] = "carrusel"): PostDraft {
  const what = `${TYPE_LABELS[l.type]} en ${l.operation} en ${l.comuna}`;
  const facts = listingFacts(l);
  const features = (l.features ?? []).slice(0, 4);
  const price = formatPrice(l.price, l.currency) + (l.operation === "arriendo" ? " mensual" : "");
  const lines = [
    l.headline ? `${what}. ${l.headline}.` : `${what}.`,
    "",
    ...facts.map((f) => `· ${f}`),
    ...(features.length ? [`· ${features.join(", ")}`] : []),
    "",
    `${price}`,
    "",
    `Escríbenos por WhatsApp al ${BULLHAUS_PUBLIC.whatsapp} con el código ${l.code} y coordinamos una visita.`,
  ];
  return {
    format,
    hook: `${TYPE_LABELS[l.type]} en ${l.comuna} · ${price}`,
    caption: lines.join("\n").replace(/\.\./g, "."),
    hashtags: [tag(l.comuna), tag(`${TYPE_LABELS[l.type]} ${l.operation}`), l.operation === "venta" ? "#PropiedadesEnVenta" : "#Arriendo", "#BullHaus"],
    cta: "Enviar mensaje por WhatsApp",
  };
}

/** Piezas de captación de propietarios: solo con los servicios y zonas que Bull Haus publica. */
export function captacionPosts(): PostDraft[] {
  const p = BULLHAUS_PUBLIC;
  const base = ["#BullHaus", "#PropiedadesLasCondes", "#CorredoraDePropiedades"];
  return [
    {
      format: "reel",
      hook: "¿Quieres vender o arrendar tu propiedad?",
      caption: [
        "¿Quieres vender o arrendar tu propiedad?",
        "",
        `En ${p.name} te acompañamos en todo el proceso: ${p.services.join(", ").toLowerCase()}.`,
        `Trabajamos en ${p.zones.join(", ")}.`,
        "",
        `Escríbenos por WhatsApp al ${p.whatsapp} y agendamos una reunión.`,
      ].join("\n"),
      hashtags: [...base, "#VendoMiCasa"],
      cta: "Agendar reunión",
    },
    {
      format: "carrusel",
      hook: "Cuánto vale tu propiedad: pide una valorización",
      caption: [
        "¿Sabes cuánto vale hoy tu propiedad?",
        "",
        `Un corredor de ${p.name} la visita y te entrega una valorización.`,
        "Es el primer paso para publicarla con un precio bien fundamentado.",
        "",
        `Escríbenos al ${p.whatsapp}.`,
      ].join("\n"),
      hashtags: [...base, "#Tasacion", "#Valorizacion"],
      cta: "Pedir valorización",
    },
    {
      format: "post",
      hook: `Desde ${p.since} en el mercado inmobiliario`,
      caption: [
        `${p.name} nace de la experiencia de corredores que trabajan juntos desde ${p.since}.`,
        "",
        `Intermediación y gestión inmobiliaria en el sector oriente de Santiago y en la V Región costa.`,
        `Oficina: ${p.office}.`,
        "",
        `¿Tienes una propiedad para vender o arrendar? Escríbenos al ${p.whatsapp}.`,
      ].join("\n"),
      hashtags: [...base, "#Zapallar", "#Cachagua"],
      cta: "Enviar mensaje",
    },
    {
      format: "historia",
      hook: "Propietarios en la costa",
      caption: [
        "¿Tienes casa en Zapallar, Papudo, Cachagua, Maitencillo o Viña del Mar?",
        "Nuestro broker de V Región costa te ayuda a venderla o arrendarla.",
        `WhatsApp ${p.whatsapp}`,
      ].join("\n"),
      hashtags: ["#BullHaus", "#Maitencillo", "#Papudo"],
      cta: "Responder historia",
    },
  ];
}
