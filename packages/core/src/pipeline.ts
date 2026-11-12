// Leads y pipeline: tipos, etapas y etiquetas visibles (docs/plataforma.md).

export const LEAD_KINDS = ["comprador", "arrendatario", "propietario"] as const;
export const LEAD_SOURCES = ["instagram", "facebook", "whatsapp", "web", "portal", "referido", "linkedin", "email"] as const;
export const LEAD_STAGES = ["nuevo", "contactado", "calificado", "visita", "propuesta", "ganado", "perdido"] as const;

export type LeadKind = (typeof LEAD_KINDS)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadStage = (typeof LEAD_STAGES)[number];

export const KIND_LABELS: Record<LeadKind, string> = {
  comprador: "Comprador",
  arrendatario: "Arrendatario",
  propietario: "Propietario (captación)",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  web: "Sitio web",
  portal: "Portales",
  referido: "Referido",
  linkedin: "LinkedIn",
  email: "Email",
};

/** Redes sociales: las fuentes que cuentan en el tablero de RRSS. */
export const SOCIAL_SOURCES: readonly LeadSource[] = ["instagram", "facebook"];

/** Pipeline de demanda (compradores y arrendatarios) y de captación (propietarios). */
export type Pipeline = "demanda" | "captacion";
export const pipelineOf = (kind: LeadKind): Pipeline => (kind === "propietario" ? "captacion" : "demanda");

export const STAGE_LABELS: Record<Pipeline, Record<LeadStage, string>> = {
  demanda: {
    nuevo: "Nuevo",
    contactado: "Contactado",
    calificado: "Calificado",
    visita: "Visita agendada",
    propuesta: "Oferta",
    ganado: "Cerrado",
    perdido: "Perdido",
  },
  captacion: {
    nuevo: "Nuevo",
    contactado: "Contactado",
    calificado: "Calificado",
    visita: "Tasación agendada",
    propuesta: "Propuesta de mandato",
    ganado: "Mandato firmado",
    perdido: "Perdido",
  },
};

/** Etapas abiertas, en el orden del tablero. */
export const OPEN_STAGES: readonly LeadStage[] = ["nuevo", "contactado", "calificado", "visita", "propuesta"];

export function isLeadStage(v: unknown): v is LeadStage {
  return typeof v === "string" && (LEAD_STAGES as readonly string[]).includes(v);
}

export const CAMPAIGN_OBJECTIVES = ["captacion", "venta", "arriendo"] as const;
export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];
export const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  captacion: "Captación de propietarios",
  venta: "Venta",
  arriendo: "Arriendo",
};

export const CAMPAIGN_STATUSES = ["borrador", "en_revision", "aprobada", "activa", "pausada", "finalizada"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  aprobada: "Aprobada",
  activa: "Activa",
  pausada: "Pausada",
  finalizada: "Finalizada",
};

/** Porcentaje con un decimal, "—" si no hay base. */
export function rate(part: number, total: number): string {
  if (total <= 0) return "—";
  return `${(Math.round((part / total) * 1000) / 10).toLocaleString("es-CL")} %`;
}
