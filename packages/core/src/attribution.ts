// Origen de cada lead de la web: de qué campaña o canal llegó (docs/diagnostico.md, oportunidad 2).
// Sin esto el ROI por canal es una suposición. Solo se guarda lo necesario para atribuir:
// parámetros UTM, identificadores de clic de Google y Meta, página de entrada y dominio de referencia.
import { z } from "zod";

const short = z.string().trim().max(120).optional();

export const AttributionSchema = z.object({
  utmSource: short,
  utmMedium: short,
  utmCampaign: short,
  utmContent: short,
  utmTerm: short,
  /** Identificador de clic de Google Ads (para devolverle conversiones). */
  gclid: z.string().trim().max(200).optional(),
  /** Identificador de clic de Meta (para devolverle conversiones). */
  fbclid: z.string().trim().max(200).optional(),
  /** Ruta de la primera página de la visita, sin parámetros. */
  landingPath: z.string().trim().max(200).optional(),
  /** Solo el dominio de referencia, nunca la URL completa. */
  referrerHost: z.string().trim().max(120).optional(),
});

export type Attribution = z.infer<typeof AttributionSchema>;

function clean(v: string | null | undefined, max: number): string | undefined {
  const t = v?.trim();
  return t ? t.slice(0, max) : undefined;
}

/** Lee el origen de la URL de entrada y del referrer. El dominio propio no cuenta como referencia. */
export function attributionFromLanding(url: string, referrer: string | undefined): Attribution {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return {};
  }
  const p = u.searchParams;
  let referrerHost: string | undefined;
  try {
    const host = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "";
    if (host && host !== u.hostname.replace(/^www\./, "")) referrerHost = host.slice(0, 120);
  } catch {
    referrerHost = undefined;
  }
  const a: Attribution = {
    utmSource: clean(p.get("utm_source"), 120),
    utmMedium: clean(p.get("utm_medium"), 120),
    utmCampaign: clean(p.get("utm_campaign"), 120),
    utmContent: clean(p.get("utm_content"), 120),
    utmTerm: clean(p.get("utm_term"), 120),
    gclid: clean(p.get("gclid"), 200),
    fbclid: clean(p.get("fbclid"), 200),
    landingPath: clean(u.pathname, 200),
    referrerHost,
  };
  return Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined)) as Attribution;
}

export const ATTRIBUTION_CHANNELS = ["meta_ads", "google_ads", "google_organico", "redes_organico", "email", "referencia", "directo"] as const;
export type AttributionChannel = (typeof ATTRIBUTION_CHANNELS)[number];

export const CHANNEL_LABELS_ATTRIBUTION: Record<AttributionChannel, string> = {
  meta_ads: "Anuncios de Meta",
  google_ads: "Google Ads",
  google_organico: "Google (orgánico)",
  redes_organico: "Redes (orgánico)",
  email: "Email",
  referencia: "Otro sitio",
  directo: "Directo",
};

const SOCIAL = /(^|\.)(facebook|instagram|fb|ig|linkedin|lnkd|tiktok|t)\.(com|co|me)$|^(l\.)?(facebook|instagram)\.com$/;
const PAID = /^(cpc|ppc|paid|paidsocial|paid_social|ads?|display|cpm)$/i;

/** Canal para los reportes de ROI, a partir del origen guardado. */
export function attributionChannel(a: Attribution): AttributionChannel {
  const src = (a.utmSource ?? "").toLowerCase();
  const med = (a.utmMedium ?? "").toLowerCase();
  if (a.gclid || (src === "google" && PAID.test(med))) return "google_ads";
  if (a.fbclid && PAID.test(med)) return "meta_ads";
  if (/^(facebook|fb|instagram|ig|meta)$/.test(src)) return PAID.test(med) ? "meta_ads" : "redes_organico";
  if (med === "email" || src === "email" || src === "newsletter") return "email";
  if (a.fbclid) return "redes_organico";
  const host = a.referrerHost ?? "";
  if (/(^|\.)google\./.test(host) || /(^|\.)bing\.com$/.test(host)) return "google_organico";
  if (SOCIAL.test(host)) return "redes_organico";
  if (host) return "referencia";
  return "directo";
}

/** Slug de comuna para URLs: "Lo Barnechea" → "lo-barnechea", "Ñuñoa" → "nunoa". */
export function comunaSlug(comuna: string): string {
  return comuna
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
