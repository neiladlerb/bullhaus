// Operaciones (deals), KYC y facturación: etapas, etiquetas y reglas que no se negocian.

export const DEAL_STAGES = ["reserva", "promesa", "contrato", "escritura", "cerrada", "caida"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
type Op = "venta" | "arriendo";

/** Camino de cada operación: la venta pasa por promesa y escritura; el arriendo por contrato y entrega. */
export const DEAL_PATH: Record<Op, readonly DealStage[]> = {
  venta: ["reserva", "promesa", "escritura", "cerrada"],
  arriendo: ["reserva", "contrato", "escritura", "cerrada"],
};

export function dealStageLabel(stage: DealStage, op: Op): string {
  if (stage === "escritura") return op === "venta" ? "Escritura" : "Entrega";
  return { reserva: "Reserva", promesa: "Promesa", contrato: "Contrato", cerrada: "Cerrada", caida: "Caída" }[stage];
}

/** Etapas que exigen KYC aprobado de todas las partes (CLAUDE.md). */
export const KYC_GATED: readonly DealStage[] = ["promesa", "contrato", "escritura", "cerrada"];

export function nextDealStage(stage: DealStage, op: Op): DealStage | null {
  const path = DEAL_PATH[op];
  const i = path.indexOf(stage);
  return i >= 0 && i < path.length - 1 ? path[i + 1]! : null;
}

/** Motivo por el que una operación no puede pasar a `to`, o null si puede. */
export function dealBlocker(to: DealStage, parties: { name: string; kycStatus: string | null }[]): string | null {
  if (!KYC_GATED.includes(to)) return null;
  if (parties.length === 0) return "La operación no tiene partes registradas.";
  const missing = parties.filter((p) => p.kycStatus !== "aprobado");
  if (missing.length === 0) return null;
  return `Falta KYC aprobado de: ${missing.map((p) => p.name).join(", ")}.`;
}

export const PARTY_LABELS = {
  vendedor: "Vendedor",
  comprador: "Comprador",
  arrendador: "Arrendador",
  arrendatario: "Arrendatario",
  codeudor: "Codeudor",
} as const;

// --- KYC --------------------------------------------------------------------

export const KYC_STATUS_LABELS = {
  pendiente: "Pendiente",
  enviado: "Enlace enviado",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
} as const;

export interface RiskInput {
  pep: boolean;
  foreign: boolean;
  juridica: boolean;
  amountUf: number;
  cashOrigin: boolean;
}

/** Puntaje 0–100 según el enfoque de riesgo (docs/plataforma.md 3.5). Alto pide debida diligencia reforzada. */
export function kycRisk(r: RiskInput): { score: number; level: "bajo" | "medio" | "alto" } {
  let score = 10;
  if (r.pep) score += 40;
  if (r.foreign) score += 15;
  if (r.juridica) score += 10;
  if (r.amountUf >= 20_000) score += 15;
  else if (r.amountUf >= 8_000) score += 8;
  if (r.cashOrigin) score += 20;
  score = Math.min(100, score);
  return { score, level: score >= 55 ? "alto" : score >= 30 ? "medio" : "bajo" };
}

// --- Facturación --------------------------------------------------------------

export const IVA_RATE = 0.19;

export const INVOICE_STATUS_LABELS = {
  borrador: "Borrador",
  aprobada: "Aprobada por Finanzas",
  emitida: "Emitida",
  pagada: "Pagada",
  vencida: "Vencida",
  anulada: "Anulada",
} as const;

/** Neto, IVA y total en pesos. La comisión en UF se convierte con la UF del día de emisión. */
export function invoiceAmounts(net: number): { netClp: number; ivaClp: number; totalClp: number } {
  const netClp = Math.round(net);
  const ivaClp = Math.round(netClp * IVA_RATE);
  return { netClp, ivaClp, totalClp: netClp + ivaClp };
}

/** Comisión neta de un lado: % del precio en venta, meses de renta en arriendo. */
export function commissionAmount(op: Op, price: number, rate: number): number {
  return op === "venta" ? (price * rate) / 100 : price * rate;
}
