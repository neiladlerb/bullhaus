import "server-only";
import { BrandSchema, BULLHAUS_BRAND, inZone, type Brand, type Currency, type Operation, type PropertyType } from "@bullhaus/core";

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

/**
 * Ficha de marca de Bull Haus. La versión guardada en el back office (Marca y sitio web) manda; si el
 * back office no responde o la ficha no pasa el esquema, la web usa la ficha base de Bull Haus.
 * Nunca se muestra con una marca genérica.
 */
export async function getBrand(): Promise<Brand> {
  try {
    const res = await fetch(`${BACKOFFICE_URL}/api/publico/marca`, { next: { revalidate: 300 } });
    if (res.ok) {
      const parsed = BrandSchema.safeParse(((await res.json()) as { brand: unknown }).brand);
      if (parsed.success) return parsed.data;
    }
    console.error(`Ficha de marca no disponible en el back office (${res.status}); se usa la ficha base de Bull Haus`);
  } catch {
    console.error("Back office sin respuesta; se usa la ficha base de Bull Haus");
  }
  return BULLHAUS_BRAND;
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
