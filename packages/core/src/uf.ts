// Valor diario de la UF publicado por mindicador.cl (fuente: Banco Central de Chile).
// Se usa en la calculadora de UF. Los precios de las fichas siguen en su moneda: la
// calculadora es una herramienta para la persona, no cambia ningún precio publicado.
import { z } from "zod";

export const UF_SOURCE_URL = "https://mindicador.cl/api/uf";

const schema = z.object({
  serie: z.array(z.object({ fecha: z.string(), valor: z.number().positive() })).min(1),
});

export interface UfValue {
  value: number;
  /** Fecha del valor, aaaa-mm-dd en hora de Chile. */
  date: string;
}

export function parseUfResponse(json: unknown): UfValue | null {
  const parsed = schema.safeParse(json);
  if (!parsed.success) return null;
  const latest = [...parsed.data.serie].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]!;
  const d = new Date(latest.fecha);
  if (Number.isNaN(d.getTime())) return null;
  // mindicador entrega medianoche de Chile en UTC (03:00 o 04:00 Z): la fecha en Santiago es la del valor.
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(d);
  return { value: latest.valor, date };
}

export const ufToClp = (uf: number, ufValue: number) => Math.round(uf * ufValue);
export const clpToUf = (clp: number, ufValue: number) => Math.round((clp / ufValue) * 100) / 100;
