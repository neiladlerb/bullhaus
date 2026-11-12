import "server-only";
import type { Currency, Operation, PropertyType } from "@bullhaus/core";

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

export const COAST = ["Zapallar", "Papudo", "Cachagua", "Maitencillo", "Viña del Mar", "Puchuncaví", "Concón", "Quintero"];

export function filterProperties(all: PublicProperty[], f: Filters): PublicProperty[] {
  let list = all;
  if (f.operacion === "venta" || f.operacion === "arriendo") list = list.filter((p) => p.operation === f.operacion);
  if (f.tipo) list = list.filter((p) => p.type === f.tipo);
  if (f.comuna) list = list.filter((p) => p.comuna === f.comuna);
  if (f.zona === "costa") list = list.filter((p) => COAST.includes(p.comuna));
  if (f.zona === "santiago") list = list.filter((p) => !COAST.includes(p.comuna));
  const d = Number(f.dormitorios);
  if (d > 0) list = list.filter((p) => (p.bedrooms ?? 0) >= d);
  // Orden por precio solo dentro de la misma moneda; no se convierte UF a pesos.
  if (f.orden === "precio-asc" || f.orden === "precio-desc") {
    const dir = f.orden === "precio-asc" ? 1 : -1;
    list = [...list].sort((a, b) => (a.currency === b.currency ? (a.price - b.price) * dir : a.currency === "UF" ? -1 : 1));
  }
  return list;
}

/** Formato de código como en el sitio anterior: 109958 → 109.958. */
export const displayCode = (code: string) => code.replace(/^(\d{3})(\d{3})/, "$1.$2");
