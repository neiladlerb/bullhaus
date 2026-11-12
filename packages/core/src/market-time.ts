import type { Operation } from "./property";

// Cuánto nos demoramos en vender o arrendar: días desde que la propiedad sale al mercado hasta la
// reserva, y desde la reserva hasta el cierre. Solo cuentan operaciones no caídas con ambas fechas.

export interface MarketDeal {
  operation: Operation;
  stage: string;
  listedAt: Date | null;
  reservedAt: Date;
  closedAt: Date | null;
}

export interface MarketTime {
  count: number;
  avgDays: number | null;
  medianDays: number | null;
  avgCloseDays: number | null;
}

const DAY = 86_400_000;
const days = (from: Date, to: Date) => (to.getTime() - from.getTime()) / DAY;
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2);
};

export function marketTime(deals: MarketDeal[], operation: Operation): MarketTime {
  const valid = deals.filter((d) => d.operation === operation && d.stage !== "caida" && d.listedAt && d.reservedAt >= d.listedAt);
  const market = valid.map((d) => days(d.listedAt!, d.reservedAt));
  const close = valid.filter((d) => d.closedAt).map((d) => days(d.reservedAt, d.closedAt!));
  return { count: valid.length, avgDays: avg(market), medianDays: median(market), avgCloseDays: avg(close) };
}

/** Promedio de días en el mercado por trimestre de reserva, del más antiguo al más reciente. */
export function marketTimeByQuarter(deals: MarketDeal[], operation: Operation): { label: string; avgDays: number; count: number }[] {
  const groups = new Map<string, number[]>();
  for (const d of deals) {
    if (d.operation !== operation || d.stage === "caida" || !d.listedAt || d.reservedAt < d.listedAt) continue;
    const q = `T${Math.floor(d.reservedAt.getMonth() / 3) + 1} ${d.reservedAt.getFullYear()}`;
    const key = `${d.reservedAt.getFullYear()}-${Math.floor(d.reservedAt.getMonth() / 3)}|${q}`;
    groups.set(key, [...(groups.get(key) ?? []), days(d.listedAt, d.reservedAt)]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, xs]) => ({ label: k.split("|")[1]!, avgDays: avg(xs)!, count: xs.length }));
}

/** Mínimo de operaciones reales para mostrar el indicador en la web pública. */
export const PUBLIC_MARKET_MIN_DEALS = 5;

// Lo que hacemos para vender o arrendar una propiedad y la tecnología que usamos en cada paso.
// Se muestra en la web y en el back office; describe procesos, no promete plazos ni cifras.
export const SALES_PROCESS: { title: string; tasks: string[]; tech: string }[] = [
  {
    title: "Valorización",
    tasks: ["Visita del corredor a la propiedad", "Comparación con la cartera y con operaciones de la zona", "Propuesta de precio y estrategia por escrito"],
    tech: "Revisión de precio por m² frente a propiedades comparables",
  },
  {
    title: "Ficha y fotos",
    tasks: ["Sesión de fotos de la propiedad", "Ficha con los datos que confirma el propietario", "Revisión y aprobación del equipo antes de publicar"],
    tech: "Ingreso asistido por IA a partir del dictado del corredor, siempre con aprobación humana",
  },
  {
    title: "Difusión",
    tasks: ["Publicación en bullhaus.cl y portales", "Posts en Instagram, Facebook y LinkedIn", "Brochure para enviar por WhatsApp y email", "Campañas dirigidas a la zona y al tipo de propiedad"],
    tech: "Agente de redes sociales que prepara los posts y mide su alcance",
  },
  {
    title: "Atención de interesados",
    tasks: ["Respuesta rápida a cada consulta, también fuera del horario de oficina", "Filtro de interesados y agenda de visitas", "Seguimiento con recordatorios para cada contacto"],
    tech: "Asistente virtual en WhatsApp, Instagram y Facebook, y pipeline con compromisos de contacto",
  },
  {
    title: "Visitas y oferta",
    tasks: ["Visitas acompañadas por un corredor", "Informe al propietario después de cada visita", "Ordenamos y presentamos las ofertas"],
    tech: "Calendario compartido y registro de cada visita en el back office",
  },
  {
    title: "Documentos y cierre",
    tasks: ["Verificación de identidad de todas las partes", "Estudio de títulos y documentos de la propiedad", "Promesa, contrato y escritura con revisión legal", "Entrega de la propiedad"],
    tech: "Verificación de identidad digital y contratos desde plantillas aprobadas por abogados",
  },
];
