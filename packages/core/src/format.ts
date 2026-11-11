// Formatos chilenos: "UF 18.500", "$1.450.000", fechas dd/mm/aaaa.

const intCl = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const ufCl = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

export function formatPrice(amount: number, currency: "UF" | "CLP"): string {
  return currency === "UF" ? `UF ${ufCl.format(amount)}` : `$${intCl.format(Math.round(amount))}`;
}

export function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

/** Interpreta números escritos a la chilena: "18.500" = 18500, "18.500,5" = 18500.5, "2,5" = 2.5. */
export function parseChileanNumber(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/^(UF|\$)\s*/i, "").replace(/\s/g, "");
  if (s === "") return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Fecha dd/mm/aaaa (o Date de Excel) a Date en UTC. */
export function parseChileanDate(input: unknown): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input !== "string") return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return date.getUTCDate() === Number(dd) && date.getUTCMonth() === Number(mm) - 1 ? date : null;
}

/** Días entre hoy y una fecha (negativo si ya pasó). */
export function daysUntil(date: Date, now: Date = new Date()): number {
  const ms = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round(ms / 86_400_000);
}
