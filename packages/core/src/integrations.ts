// Integraciones externas: qué está simulado en la demostración y qué hace falta para producción.
// Un registro con isDemo usa el modo simulado; un registro real exige la integración conectada.

export type IntegrationMode = "simulada" | "conectada" | "no_conectada";

export interface IntegrationSpec {
  key: string;
  name: string;
  module: string;
  /** Variables de entorno que, si están todas, indican que la integración real está configurada. */
  env: string[];
  simulates: string;
  needs: string[];
}

export const INTEGRATIONS: readonly IntegrationSpec[] = [
  {
    key: "meta_business",
    name: "Meta Business (Instagram y Facebook)",
    module: "Redes, campañas y control de gestión",
    env: ["META_APP_ID", "META_APP_SECRET", "META_PAGE_TOKEN", "META_AD_ACCOUNT_ID"],
    simulates: "Cuentas @bullhaus_propiedades y BullHauspropiedades, publicaciones con métricas, campañas con gasto diario e Insights.",
    needs: ["Meta Business Manager verificado", "App de Meta aprobada para instagram_basic, pages_read_engagement, ads_read y ads_management", "Cuenta publicitaria con medio de pago"],
  },
  {
    key: "linkedin",
    name: "LinkedIn (página de empresa)",
    module: "Redes: serie \"Bull Haus te asesora\"",
    env: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_ORG_ID", "LINKEDIN_ACCESS_TOKEN"],
    simulates: "Página de empresa de Bull Haus con 90 días de seguidores y publicaciones de consejos inmobiliarios con sus resultados.",
    needs: ["Página de empresa de Bull Haus en LinkedIn con un administrador", "App de LinkedIn con Community Management API aprobada (w_organization_social, r_organization_social)", "Calendario editorial aprobado por Bull Haus"],
  },
  {
    key: "whatsapp",
    name: "WhatsApp Cloud API",
    module: "Agentes IA",
    env: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"],
    simulates: "Conversaciones del agente con compradores, arrendatarios y propietarios, con agendamiento de visitas y bajas.",
    needs: ["Número dedicado (no usado en la app de WhatsApp)", "Plantillas aprobadas por Meta para mensajes fuera de 24 h", "Modelo de IA conectado (ver la integración del modelo)"],
  },
  {
    key: "anthropic",
    name: "Modelo de IA (Claude u OpenAI)",
    module: "Agentes IA y textos",
    env: ["LLM_PROVIDER"],
    simulates: "Respuestas del agente escritas de antemano a partir de las fichas.",
    needs: [
      "LLM_PROVIDER=anthropic (Claude, por defecto) u openai, con su clave; se cambia sin tocar el agente (packages/llm)",
      "Proveedor elegido con los evals: el mismo set de conversaciones contra cada uno",
      "DPA del proveedor aceptado y listado en la política de privacidad (Ley 21.719)",
    ],
  },
  {
    key: "calendar",
    name: "Calendario de corredores (Google o Microsoft)",
    module: "Agentes IA",
    env: ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET"],
    simulates: "Huecos de visita y tasación inventados.",
    needs: ["Acceso a los calendarios de cada corredor"],
  },
  {
    key: "voice",
    name: "Telefonía para el agente de voz",
    module: "Agentes IA",
    env: ["VOICE_PROVIDER_KEY"],
    simulates: "Transcripciones de llamadas entrantes.",
    needs: ["Número telefónico y proveedor de voz", "Aviso de grabación aprobado por el abogado"],
  },
  {
    key: "kyc",
    name: "Proveedor de verificación de identidad",
    module: "KYC",
    env: ["KYC_PROVIDER", "KYC_PROVIDER_KEY"],
    simulates: "Validación del carnet, prueba de vida y revisión de listas con resultados ficticios. No se sube ningún documento.",
    needs: ["Elegir Truora, MetaMap o Sumsub", "Inscripción en la UAF y oficial de cumplimiento", "Validación legal de la biometría (Ley 21.719)"],
  },
  {
    key: "billing",
    name: "Facturación electrónica",
    module: "Facturación",
    env: ["BILLING_PROVIDER", "BILLING_PROVIDER_KEY"],
    simulates: "Folios y emisión de facturas de comisión. No se envía nada al SII.",
    needs: ["Razón social, RUT, giro y régimen tributario", "Cuenta en el proveedor (OpenFactura, Bsale u otro) con certificado digital"],
  },
  {
    key: "ga4",
    name: "Google Analytics 4",
    module: "Control de gestión",
    env: ["GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT"],
    simulates: "Visitas al sitio, vistas de fichas, clics a WhatsApp y formularios por día.",
    needs: ["Propiedad de GA4 para el sitio nuevo", "Cuenta de servicio con lectura"],
  },
  {
    key: "google_ads",
    name: "Google Ads",
    module: "Control de gestión",
    env: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"],
    simulates: "Campañas de búsqueda con gasto, clics y contactos diarios.",
    needs: ["Cuenta de Google Ads", "Token de desarrollador aprobado"],
  },
  {
    key: "esign",
    name: "Firma electrónica",
    module: "Contratos",
    env: ["ESIGN_PROVIDER_KEY"],
    simulates: "Estados enviado y firmado de los documentos.",
    needs: ["Plantillas aprobadas por el abogado de Bull Haus", "Proveedor de firma electrónica avanzada si el abogado lo exige"],
  },
];

export function integrationMode(spec: IntegrationSpec, env: Record<string, string | undefined>, hasDemoData: boolean): IntegrationMode {
  if (spec.env.every((k) => Boolean(env[k]))) return "conectada";
  return hasDemoData ? "simulada" : "no_conectada";
}

// --- Agentes ------------------------------------------------------------------

export const CHANNEL_LABELS = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook", voz: "Voz" } as const;

export const OUTCOME_LABELS: Record<string, string> = {
  visita_agendada: "Visita agendada",
  tasacion_agendada: "Tasación agendada",
  llamada_agendada: "Llamada agendada",
  derivada: "Derivada a corredor",
  baja: "Baja",
  informacion: "Solo información",
  sin_respuesta: "Sin respuesta",
};

/** Las palabras de baja se procesan sin pasar por el modelo (CLAUDE.md). */
export function isStopWord(text: string, stopWords: readonly string[]): boolean {
  const t = text.trim().toUpperCase().replace(/[.!¡]/g, "");
  return stopWords.some((w) => t === w.toUpperCase());
}

export type Channel = keyof typeof CHANNEL_LABELS;
