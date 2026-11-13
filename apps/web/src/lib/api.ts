import "server-only";
import { BrandSchema, inZone, type Brand, type Currency, type Operation, type PropertyType } from "@bullhaus/core";

// La web no tiene credenciales de base de datos: lee las fichas publicadas desde la API
// pública del back office, que solo entrega propiedades disponibles y nunca la dirección exacta.
export const BACKOFFICE_URL = (process.env.BACKOFFICE_URL ?? "http://localhost:3100").replace(/\/+$/, "");

export interface Photo {
  sm: string;
  md: string;
  lg: string;
  label: string | null;
}

export interface PublicProperty {
  code: string;
  operation: Operation;
  type: PropertyType;
  comuna: string;
  sector: string | null;
  headline: string | null;
  price: number;
  currency: Currency;
  commonExpensesClp: number | null;
  m2Useful: number | null;
  m2Land: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  storage: number | null;
  pets: "si" | "no" | "consultar" | null;
  furnished: boolean | null;
  features: string[];
  details: Record<string, string> | null;
  description: string | null;
  broker: { name: string; email: string; phone: string | null };
  photos: Photo[];
  photoCount: number;
}

export const photoUrl = (key: string) => `${BACKOFFICE_URL}/media/${key}`;

export async function getProperties(): Promise<PublicProperty[]> {
  try {
    const res = await fetch(`${BACKOFFICE_URL}/api/publico/propiedades`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return ((await res.json()) as { properties: PublicProperty[] }).properties;
  } catch {
    return [];
  }
}

export async function getProperty(code: string): Promise<PublicProperty | null> {
  try {
    const res = await fetch(`${BACKOFFICE_URL}/api/publico/propiedades/${encodeURIComponent(code)}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return ((await res.json()) as { property: PublicProperty }).property;
  } catch {
    return null;
  }
}

export interface Filters {
  operacion?: string;
  tipo?: string;
  comuna?: string;
  dormitorios?: string;
  orden?: string;
  zona?: string;
}

export function filterProperties(all: PublicProperty[], f: Filters, zones: Brand["zones"] = []): PublicProperty[] {
  let list = all;
  if (f.operacion === "venta" || f.operacion === "arriendo") list = list.filter((p) => p.operation === f.operacion);
  if (f.tipo) list = list.filter((p) => p.type === f.tipo);
  if (f.comuna) list = list.filter((p) => p.comuna === f.comuna);
  const zona = f.zona;
  if (zona && zones.some((z) => z.key === zona)) list = list.filter((p) => inZone(zones, zona, p.comuna));
  const d = Number(f.dormitorios);
  if (d > 0) list = list.filter((p) => (p.bedrooms ?? 0) >= d);
  // Orden por precio solo dentro de la misma moneda; no se convierte UF a pesos.
  if (f.orden === "precio-asc" || f.orden === "precio-desc") {
    const dir = f.orden === "precio-asc" ? 1 : -1;
    list = [...list].sort((a, b) => (a.currency === b.currency ? (a.price - b.price) * dir : a.currency === "UF" ? -1 : 1));
  }
  return list;
}

// Si el back office no responde, la web se muestra con una marca neutra en vez de caerse. Nunca con los
// datos de otra corredora.
const NEUTRAL_BRAND: Brand = {
  name: "Corredora de propiedades",
  shortName: "la corredora",
  legalName: "Corredora de propiedades",
  siteUrl: (process.env.SITE_URL ?? "https://localhost").replace(/\/+$/, ""),
  description: "Venta y arriendo de propiedades.",
  logo: { lines: ["PROPIEDADES"] },
  colors: { brand: "#3f3f3e", brandDark: "#2f2f2e", ink: "#2f2f2e", coal: "#3f3f3e" },
  contact: { whatsapp: "", email: "", office: "" },
  social: {},
  texts: {
    heroEyebrow: "Venta y arriendo",
    heroTitle: "Propiedades en venta y arriendo",
    heroSubtitle: "Estamos actualizando el sitio. Vuelve en unos minutos.",
    heroImage: "/hero-casa.webp",
    ownerPitch: "Un corredor visita tu propiedad y te entrega una valorización.",
    ownerAreas: "Escríbenos para coordinar una valorización.",
    aboutTitle: "Quiénes somos",
    aboutParagraphs: ["Estamos actualizando esta sección."],
  },
  zones: [],
  team: [],
};

/** Ficha de marca de la corredora, desde el back office. */
export async function getBrand(): Promise<Brand> {
  try {
    const res = await fetch(`${BACKOFFICE_URL}/api/publico/marca`, { next: { revalidate: 300 } });
    if (!res.ok) return NEUTRAL_BRAND;
    const parsed = BrandSchema.safeParse(((await res.json()) as { brand: unknown }).brand);
    return parsed.success ? parsed.data : NEUTRAL_BRAND;
  } catch {
    return NEUTRAL_BRAND;
  }
}

/** Formato de código como en el sitio anterior: 109958 → 109.958. */
export const displayCode = (code: string) => code.replace(/^(\d{3})(\d{3})/, "$1.$2");

export interface PublicIndicators {
  venta: { avgDays: number; count: number } | null;
  arriendo: { avgDays: number; count: number } | null;
  closedLast12m: number;
}

/** Cifras de operaciones reales de los últimos 12 meses. Si no hay suficientes, vienen en null. */
export async function getIndicators(): Promise<PublicIndicators> {
  const empty: PublicIndicators = { venta: null, arriendo: null, closedLast12m: 0 };
  try {
    const res = await fetch(`${BACKOFFICE_URL}/api/publico/indicadores`, { next: { revalidate: 3600 } });
    if (!res.ok) return empty;
    return (await res.json()) as PublicIndicators;
  } catch {
    return empty;
  }
}
