// Revisión de precios: compara el precio por m² de cada propiedad con la mediana de la
// propia cartera de Bull Haus (misma operación, tipo y moneda; si hay pocas, también la
// misma comuna). Solo señala: nunca cambia un precio. No convierte UF a pesos.
import type { Currency, Operation, PropertyType } from "./property";

export interface PriceInput {
  id: string;
  code: string;
  operation: Operation;
  type: PropertyType;
  comuna: string;
  price: number;
  currency: Currency;
  m2Useful: number | null;
  headline?: string | null;
  description?: string | null;
}

export type PriceFlag = "sobre" | "bajo" | "pack" | "sin_m2";

export interface PriceReview {
  id: string;
  code: string;
  perM2: number | null;
  median: number | null;
  /** Diferencia con la mediana, en proporción (0,4 = 40 % sobre). */
  deviation: number | null;
  /** Con qué grupo se comparó: "Las Condes" o "toda la cartera". */
  basis: string | null;
  sample: number;
  flags: PriceFlag[];
}

export const PRICE_FLAG_LABELS: Record<PriceFlag, string> = {
  sobre: "Sobre la mediana",
  bajo: "Bajo la mediana",
  pack: "Precio por más de una unidad",
  sin_m2: "Sin superficie: no se puede comparar",
};

/** Desviación desde la que se marca una propiedad. */
export const PRICE_THRESHOLD = 0.35;
/** Mínimo de propiedades para que una mediana sirva. */
const MIN_SAMPLE = 3;

// "2 departamentos por piso" describe el edificio, no un pack.
const PACK = /\bpack\b|\b(2|dos|3|tres)\s+(deptos?|departamentos|casas|oficinas)\b(?!\s+(por|en cada)\s+(piso|nivel))/i;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function reviewPrices(items: PriceInput[]): PriceReview[] {
  const isPack = (p: PriceInput) => PACK.test(`${p.headline ?? ""} ${p.description ?? ""}`);
  const perM2 = (p: PriceInput) => (p.m2Useful && p.m2Useful > 0 ? p.price / p.m2Useful : null);
  // Los packs no entran en las medianas: su precio cubre varias unidades.
  const comparable = items.filter((p) => perM2(p) !== null && !isPack(p));
  const key = (p: PriceInput, withComuna: boolean) => [p.operation, p.type, p.currency, withComuna ? p.comuna : "*"].join("|");
  const groups = new Map<string, number[]>();
  for (const p of comparable) {
    for (const k of [key(p, true), key(p, false)]) groups.set(k, [...(groups.get(k) ?? []), perM2(p)!]);
  }

  return items.map((p) => {
    const unit = perM2(p);
    const flags: PriceFlag[] = [];
    if (isPack(p)) flags.push("pack");
    if (unit === null) {
      flags.push("sin_m2");
      return { id: p.id, code: p.code, perM2: null, median: null, deviation: null, basis: null, sample: 0, flags };
    }
    let sample = groups.get(key(p, true)) ?? [];
    let basis = p.comuna;
    if (sample.length < MIN_SAMPLE) {
      sample = groups.get(key(p, false)) ?? [];
      basis = "toda la cartera";
    }
    const m = sample.length >= MIN_SAMPLE ? median(sample) : null;
    const deviation = m ? unit / m - 1 : null;
    if (deviation !== null && !flags.includes("pack")) {
      if (deviation > PRICE_THRESHOLD) flags.push("sobre");
      if (deviation < -PRICE_THRESHOLD) flags.push("bajo");
    }
    return { id: p.id, code: p.code, perM2: unit, median: m, deviation, basis: m ? basis : null, sample: m ? sample.length : 0, flags };
  });
}
