// Protección de datos según el país del proyecto. Detalle en docs/residencia-datos.md.
//
// Las medidas dependen de la jurisdicción:
// - "cl" (Chile, Ley 21.719): se puede transferir al extranjero con contrato (DPA y cláusulas).
//   Claude u OpenAI por su API directa en EE. UU. están permitidos.
// - "eu" (RGPD con residencia en la UE): el modelo tiene que procesar en la UE.
//   Que la función corra en París no basta: manda el endpoint al que se llama.

export type Jurisdiction = "cl" | "eu";

/** Bull Haus atiende a clientes en Chile. */
export const PROJECT_JURISDICTION: Jurisdiction = "cl";

/** Regiones de funciones de Vercel elegidas para este proyecto (las fija cada vercel.json). */
export const HOSTING_REGIONS = ["cdg1"] as const;

export const VERCEL_EU_REGIONS = ["arn1", "cdg1", "dub1", "fra1"] as const;

export function isVercelEuRegion(region: string): boolean {
  return (VERCEL_EU_REGIONS as readonly string[]).includes(region);
}

/** anthropic y openai: API directa. vertex y bedrock: Claude en la nube de Google o AWS, con región elegible. */
export type ModelProvider = "anthropic" | "openai" | "vertex" | "bedrock";
export const MODEL_PROVIDERS: readonly ModelProvider[] = ["anthropic", "openai", "vertex", "bedrock"];

export interface ModelRoute {
  provider: ModelProvider;
  /** Región donde se ejecuta la inferencia. */
  region: string;
  /** true si la inferencia queda en la UE. */
  eu: boolean;
}

export class DataResidencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataResidencyError";
  }
}

type Env = Record<string, string | undefined>;

function isEuRegion(provider: ModelProvider, region: string): boolean {
  if (provider === "bedrock") return /^eu-[a-z]+-\d$/.test(region);
  if (provider === "vertex") return region === "eu" || /^europe-[a-z]+\d+$/.test(region);
  return false; // La API directa de Anthropic solo fija "us" o "global"; OpenAI exige un proyecto con residencia aprobada.
}

/**
 * Decide por dónde se llama al modelo según LLM_PROVIDER y LLM_REGION.
 * Con jurisdicción "eu", en producción y vistas previas lanza DataResidencyError si la inferencia no queda en la UE.
 */
export function resolveModelRoute(env: Env, jurisdiction: Jurisdiction = PROJECT_JURISDICTION): ModelRoute {
  const provider = (env.LLM_PROVIDER ?? "").trim() as ModelProvider;
  if (!MODEL_PROVIDERS.includes(provider)) throw new DataResidencyError(`LLM_PROVIDER desconocido: "${provider}". Usa ${MODEL_PROVIDERS.join(", ")}.`);
  const region = (env.LLM_REGION ?? "").trim() || (provider === "anthropic" || provider === "openai" ? "us" : "");
  if ((provider === "vertex" || provider === "bedrock") && !region) throw new DataResidencyError(`${provider} exige LLM_REGION.`);

  const route: ModelRoute = { provider, region, eu: isEuRegion(provider, region) };
  // Las vistas previas de Vercel también cuentan: pueden apuntar a datos reales.
  const production = env.NODE_ENV === "production" || (env.VERCEL_ENV !== undefined && env.VERCEL_ENV !== "development");
  if (jurisdiction === "eu" && production && !route.eu) {
    throw new DataResidencyError(
      `Proyecto con residencia UE: ${provider} en "${region}" procesa fuera de la UE. Usa vertex (europe-* o eu) o bedrock (eu-*).`,
    );
  }
  return route;
}

// --- Subencargados -----------------------------------------------------------------

/** sin_transferencia: no sale del país o región exigidos · contrato: DPA y cláusulas contractuales · dpf: EU-US Data Privacy Framework. */
export type Safeguard = "sin_transferencia" | "contrato" | "dpf" | "pendiente";

export interface Subprocessor {
  name: string;
  purpose: string;
  /** Dónde se procesan los datos personales. */
  location: string;
  safeguard: Safeguard;
  /** Si recibe el contenido de mensajes o documentos (no solo metadatos). */
  content: boolean;
  /** Integración de INTEGRATIONS a la que corresponde, si existe. */
  integration?: string;
  note?: string;
}

/** Lista que se mantiene al día con docs/residencia-datos.md y la página /privacidad. */
export const SUBPROCESSORS: readonly Subprocessor[] = [
  { name: "Supabase", purpose: "Base de datos y archivos", location: "UE (París)", safeguard: "contrato", content: true },
  { name: "Vercel", purpose: "Alojamiento de la web y el back office", location: "UE (París); CDN y registros de plataforma globales", safeguard: "contrato", content: true },
  { name: "Anthropic (Claude)", purpose: "Respuestas del agente y textos", location: "EE. UU.", safeguard: "contrato", content: true, integration: "anthropic", note: "No usa los datos de la API para entrenar." },
  { name: "OpenAI", purpose: "Modelo alternativo del agente, si se elige tras los evals", location: "EE. UU.", safeguard: "contrato", content: true, integration: "anthropic", note: "Solo si se activa con LLM_PROVIDER=openai." },
  { name: "Meta (WhatsApp, Instagram, Facebook)", purpose: "Mensajería y redes", location: "EE. UU. y otros", safeguard: "contrato", content: true, integration: "whatsapp", note: "Inevitable para usar WhatsApp; el contacto escribe por un canal de Meta." },
  { name: "Google (Calendar, Analytics, Ads)", purpose: "Agenda de corredores y medición con consentimiento", location: "EE. UU. y otros", safeguard: "contrato", content: false, integration: "calendar" },
  { name: "LinkedIn", purpose: "Publicaciones de la página de empresa", location: "EE. UU. y otros", safeguard: "contrato", content: false, integration: "linkedin" },
  { name: "Proveedor de voz", purpose: "Llamadas del agente de voz", location: "Por definir", safeguard: "pendiente", content: true, integration: "voice" },
  { name: "Proveedor de KYC", purpose: "Verificación de identidad", location: "Por definir", safeguard: "pendiente", content: true, integration: "kyc" },
  { name: "Facturación electrónica", purpose: "Emisión de documentos tributarios", location: "Chile", safeguard: "sin_transferencia", content: false, integration: "billing" },
  { name: "Firma electrónica", purpose: "Firma de contratos", location: "Por definir", safeguard: "pendiente", content: true, integration: "esign" },
];
