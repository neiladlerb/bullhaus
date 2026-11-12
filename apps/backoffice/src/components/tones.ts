// Colores de estado compartidos por operaciones, KYC, contratos y facturas.
type Tone = "sky" | "amber" | "violet" | "green" | "red" | "gray";

export const STAGE_TONE: Record<string, Tone> = { reserva: "sky", promesa: "amber", contrato: "amber", escritura: "violet", cerrada: "green", caida: "red" };
export const KYC_TONE: Record<string, Tone> = { pendiente: "gray", enviado: "sky", en_revision: "amber", aprobado: "green", rechazado: "red" };
export const RISK_TONE: Record<string, Tone> = { bajo: "green", medio: "amber", alto: "red" };
export const CONTRACT_TONE: Record<string, Tone> = { borrador: "gray", enviado: "sky", firmado: "green", anulado: "red" };
export const INVOICE_TONE: Record<string, Tone> = { borrador: "gray", aprobada: "sky", emitida: "violet", pagada: "green", vencida: "red", anulada: "gray" };

export const BROCHURE_TONE = { borrador: "gray", en_revision: "amber", aprobado: "green", archivado: "gray" } as const;
export const DUE_TONE = { vencido: "red", hoy: "amber", proximo: "sky" } as const;
