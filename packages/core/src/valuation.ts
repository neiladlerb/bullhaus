// Tasación comercial por comparables: valor por m² de propiedades parecidas en la misma comuna (y mejor si es el
// mismo sector). No usa IA: es una mediana con su rango, y cada número se puede rastrear hasta un comparable.
// No convierte UF a pesos: solo se comparan propiedades en la misma moneda que la tasada.
// Es una opinión comercial de valor para fijar el precio de publicación, no una tasación bancaria ni pericial.
import type { Currency, Operation, PropertyType } from "./property";

export const COMPARABLE_SOURCES = ["cierre", "cartera", "manual"] as const;
export type ComparableSource = (typeof COMPARABLE_SOURCES)[number];

export const COMPARABLE_SOURCE_LABELS: Record<ComparableSource, string> = {
  cierre: "Operación cerrada (precio de cierre)",
  cartera: "Cartera Bull Haus (precio publicado)",
  manual: "Aviso de portal (precio publicado)",
};

export interface ValuationSubject {
  operation: Operation;
  type: PropertyType;
  comuna: string;
  sector: string | null;
  currency: Currency;
  m2Useful: number | null;
  m2Land: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

export interface ComparableInput {
  source: ComparableSource;
  operation: Operation;
  type: PropertyType;
  comuna: string;
  sector: string | null;
  currency: Currency;
  price: number;
  m2Useful: number | null;
  m2Land: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

/** Terrenos y parcelas se comparan por m² de terreno; lo demás, por m² útiles. */
export const usesLandArea = (type: PropertyType) => type === "terreno" || type === "parcela";

export function comparisonArea(p: { type: PropertyType; m2Useful: number | null; m2Land: number | null }): number | null {
  const a = usesLandArea(p.type) ? p.m2Land : p.m2Useful;
  return a && a > 0 ? a : null;
}

export function perM2(c: ComparableInput): number | null {
  const a = comparisonArea(c);
  return a && c.price > 0 ? c.price / a : null;
}

const norm = (s: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Superficie aceptable para un comparable: entre 60 % y 160 % de la tasada. */
export const AREA_MIN_RATIO = 0.6;
export const AREA_MAX_RATIO = 1.6;

/** Por qué un candidato no sirve como comparable, o null si sirve. */
export function comparableProblem(subject: ValuationSubject, c: ComparableInput): string | null {
  if (c.operation !== subject.operation) return "Otra operación";
  if (c.type !== subject.type) return "Otro tipo de propiedad";
  if (c.currency !== subject.currency) return `Precio en ${c.currency}: no se convierte`;
  if (norm(c.comuna) !== norm(subject.comuna)) return "Otra comuna";
  const a = comparisonArea(c);
  if (!a) return "Sin superficie";
  if (!(c.price > 0)) return "Sin precio";
  const s = comparisonArea(subject);
  if (s && (a < s * AREA_MIN_RATIO || a > s * AREA_MAX_RATIO)) return "Superficie muy distinta";
  return null;
}

/** Más alto, más parecido: mismo sector, superficie cercana, mismos dormitorios y baños; los cierres pesan más. */
export function similarityScore(subject: ValuationSubject, c: ComparableInput): number {
  let score = 0;
  if (subject.sector && norm(subject.sector) === norm(c.sector)) score += 3;
  const s = comparisonArea(subject);
  const a = comparisonArea(c);
  if (s && a) score -= Math.abs(Math.log(a / s)) * 6;
  if (subject.bedrooms !== null && c.bedrooms !== null) score -= Math.abs(subject.bedrooms - c.bedrooms);
  if (subject.bathrooms !== null && c.bathrooms !== null) score -= Math.abs(subject.bathrooms - c.bathrooms) * 0.5;
  if (c.source === "cierre") score += 1;
  return score;
}

/** Los candidatos que sirven, del más parecido al menos parecido. */
export function suggestComparables<T extends ComparableInput>(subject: ValuationSubject, candidates: T[], limit = 10): T[] {
  return candidates
    .filter((c) => comparableProblem(subject, c) === null)
    .map((c) => ({ c, score: similarityScore(subject, c) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.c);
}

/** Percentil con interpolación lineal (0,5 = mediana). */
export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

export type ValuationConfidence = "alta" | "media" | "baja";

export const CONFIDENCE_LABELS: Record<ValuationConfidence, string> = {
  alta: "Alta: 6 o más comparables",
  media: "Media: 3 a 5 comparables",
  baja: "Baja: menos de 3 comparables",
};

/** Un comparable que se aleja más que esto de la mediana se marca como atípico (el corredor decide si lo saca). */
export const OUTLIER_RATIO = 0.4;

export interface ValuationResult {
  count: number;
  area: number | null;
  perM2: { p25: number; median: number; p75: number } | null;
  /** Valor sugerido y rango (percentiles 25 a 75), en la moneda de la tasada. Null si falta superficie o comparables. */
  value: { low: number; point: number; high: number } | null;
  confidence: ValuationConfidence;
  /** Índices (en la lista recibida) de los comparables atípicos. */
  outliers: number[];
  /** Cuántos cierres hay entre los comparables: los precios publicados suelen estar sobre el cierre. */
  closings: number;
}

/** Redondeo para mostrar un valor de tasación: UF a la decena, pesos a la decena de mil. */
export function roundValue(n: number, currency: Currency): number {
  const step = currency === "UF" ? (n >= 1000 ? 10 : 1) : n >= 1_000_000 ? 10_000 : 1_000;
  return Math.round(n / step) * step;
}

export function valuationResult(subject: ValuationSubject, comparables: ComparableInput[]): ValuationResult {
  const usable = comparables.map((c, i) => ({ i, c, v: comparableProblem(subject, c) === null ? perM2(c) : null })).filter((x): x is { i: number; c: ComparableInput; v: number } => x.v !== null);
  const values = usable.map((x) => x.v);
  const area = comparisonArea(subject);
  const n = values.length;
  const confidence: ValuationConfidence = n >= 6 ? "alta" : n >= 3 ? "media" : "baja";
  const closings = usable.filter((x) => x.c.source === "cierre").length;
  if (!n) return { count: 0, area, perM2: null, value: null, confidence, outliers: [], closings };
  const p25 = quantile(values, 0.25)!;
  const med = quantile(values, 0.5)!;
  const p75 = quantile(values, 0.75)!;
  const outliers = usable.filter((x) => Math.abs(x.v / med - 1) > OUTLIER_RATIO).map((x) => x.i);
  const value = area
    ? { low: roundValue(p25 * area, subject.currency), point: roundValue(med * area, subject.currency), high: roundValue(p75 * area, subject.currency) }
    : null;
  return { count: n, area, perM2: { p25, median: med, p75 }, value, confidence, outliers, closings };
}
