// Brochures y compromisos de contacto: etiquetas, mensajes prearmados y enlaces para compartir.
// Los mensajes los envía el corredor desde su WhatsApp o su correo (enlace con texto prearmado):
// el sistema no escribe solo a nadie y no hay mensajes en frío (CLAUDE.md). Los textos no piden
// documentos, no negocian precios ni dan asesoría de crédito o legal.

import type { LeadKind, LeadSource } from "./pipeline";

export type BrochureKind = "captacion" | "venta" | "arriendo";
export type BrochureStatus = "borrador" | "en_revision" | "aprobado" | "archivado";
export type ShareChannel = "whatsapp" | "instagram" | "facebook" | "linkedin" | "email" | "enlace";
export type TaskKind = "llamar" | "whatsapp" | "email" | "visita" | "seguimiento";

export const BROCHURE_KIND_LABELS: Record<BrochureKind, string> = { captacion: "Captación de propietarios", venta: "Venta", arriendo: "Arriendo" };
export const BROCHURE_STATUS_LABELS: Record<BrochureStatus, string> = { borrador: "Borrador", en_revision: "En revisión", aprobado: "Aprobado", archivado: "Archivado" };
export const SHARE_CHANNEL_LABELS: Record<ShareChannel, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", email: "Email", enlace: "Enlace" };
export const TASK_KIND_LABELS: Record<TaskKind, string> = { llamar: "Llamar", whatsapp: "WhatsApp", email: "Email", visita: "Visita", seguimiento: "Seguimiento" };

/** Qué tipo de lead deja sus datos en cada brochure. */
export const BROCHURE_LEAD_KIND: Record<BrochureKind, LeadKind> = { captacion: "propietario", venta: "comprador", arriendo: "arrendatario" };

/** Fuente del lead según el canal por el que llegó el brochure. */
export function sourceForChannel(channel: ShareChannel | null | undefined): LeadSource {
  if (!channel || channel === "enlace") return "web";
  return channel;
}

export function brochureShareText(kind: BrochureKind, title: string, url: string): string {
  if (kind === "captacion") return `${title}. Conoce cómo trabajamos y pide una valorización de tu propiedad: ${url}`;
  return `${title}. Fotos, características y agenda de visita en el brochure: ${url}`;
}

// --- Mensajes prearmados -------------------------------------------------------

export interface ContactTemplate {
  key: string;
  label: string;
  /** Tipos de lead para los que tiene sentido. */
  kinds: readonly LeadKind[];
  subject: string;
  body: string;
}

/** Variables: {nombre}, {corredor}, {propiedad}, {fecha}, {enlace}. Las que no se conocen se quitan con su frase. */
export const CONTACT_TEMPLATES: ContactTemplate[] = [
  {
    key: "primer_contacto",
    label: "Primer contacto",
    kinds: ["comprador", "arrendatario", "propietario"],
    subject: "Bull Haus: gracias por contactarnos",
    body: "Hola {nombre}, soy {corredor} de Bull Haus. Recibimos tu consulta[ por {propiedad}] y quería ponerme a tu disposición. ¿Te acomoda que conversemos hoy o mañana?",
  },
  {
    key: "envio_brochure",
    label: "Envío de brochure",
    kinds: ["comprador", "arrendatario", "propietario"],
    subject: "Bull Haus: te comparto la información",
    body: "Hola {nombre}, te comparto el brochure[ de {propiedad}] con fotos y detalles: {enlace}. Si quieres, coordinamos una visita.",
  },
  {
    key: "confirmar_visita",
    label: "Confirmar visita",
    kinds: ["comprador", "arrendatario"],
    subject: "Bull Haus: confirmación de visita",
    body: "Hola {nombre}, te escribo para confirmar la visita[ a {propiedad}][ el {fecha}]. Cualquier cambio me avisas por aquí. Saludos, {corredor}.",
  },
  {
    key: "seguimiento_visita",
    label: "Seguimiento después de la visita",
    kinds: ["comprador", "arrendatario"],
    subject: "Bull Haus: ¿qué te pareció la visita?",
    body: "Hola {nombre}, ¿qué te pareció la visita[ a {propiedad}]? Si te quedó alguna duda o quieres verla de nuevo, coordinamos cuando te acomode. Saludos, {corredor}.",
  },
  {
    key: "sin_respuesta",
    label: "Retomar contacto",
    kinds: ["comprador", "arrendatario", "propietario"],
    subject: "Bull Haus: retomando tu consulta",
    body: "Hola {nombre}, te escribo para saber si sigues buscando[ y si te interesa {propiedad}]. Si prefieres que no te contactemos, respóndeme BAJA y no te escribimos más. Saludos, {corredor}.",
  },
  {
    key: "agendar_valorizacion",
    label: "Agendar valorización",
    kinds: ["propietario"],
    subject: "Bull Haus: valorización de tu propiedad",
    body: "Hola {nombre}, soy {corredor} de Bull Haus. Para preparar la valorización de tu propiedad me gustaría visitarla. ¿Qué día y horario te acomodan?",
  },
  {
    key: "propuesta_mandato",
    label: "Seguimiento de la propuesta",
    kinds: ["propietario"],
    subject: "Bull Haus: propuesta para tu propiedad",
    body: "Hola {nombre}, ¿pudiste revisar la propuesta que te enviamos para tu propiedad? Quedo atento para resolver tus dudas y conversar los siguientes pasos. Saludos, {corredor}.",
  },
];

export interface MessageVars {
  nombre: string;
  corredor: string;
  propiedad?: string | null;
  fecha?: string | null;
  enlace?: string | null;
}

/** Arma el texto: reemplaza variables y quita las frases entre [corchetes] cuyas variables no se conocen. */
export function renderMessage(template: string, vars: MessageVars): string {
  const values: Record<string, string | null | undefined> = { nombre: vars.nombre.split(" ")[0], corredor: vars.corredor, propiedad: vars.propiedad, fecha: vars.fecha, enlace: vars.enlace };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
  return template
    .replace(/\[([^\]]*)\]/g, (_, part: string) => ([...part.matchAll(/\{(\w+)\}/g)].every((m) => values[m[1]!]) ? fill(part) : ""))
    .replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "")
    .replace(/\s+([,.?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function templateFor(key: string | null | undefined): ContactTemplate | undefined {
  return CONTACT_TEMPLATES.find((t) => t.key === key);
}

// --- Enlaces ---------------------------------------------------------------------

/** Solo dígitos, con 56 delante si es un celular chileno sin código de país. */
export function waPhone(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length === 9 && d.startsWith("9")) return `56${d}`;
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

/** Enlace "click to chat": abre el WhatsApp del corredor con el texto escrito; lo envía él. */
export function waLink(text: string, phone?: string | null): string {
  const p = phone ? waPhone(phone) : null;
  return `https://wa.me/${p ?? ""}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function socialShareLink(channel: "facebook" | "linkedin", url: string): string {
  return channel === "facebook" ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

// --- Fechas de compromisos (hora de Santiago, 24 h) ------------------------------------

export const TIMEZONE = "America/Santiago";

export function formatDateTimeCl(d: Date): string {
  const parts = new Intl.DateTimeFormat("es-CL", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour")}:${g("minute")}`;
}

/** Convierte fecha y hora locales de Santiago ("2026-11-12", "15:30") a un instante. */
export function santiagoToDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Diferencia de Santiago con UTC en esa fecha (horario de verano incluido).
  const asLocal = new Date(new Date(guess).toLocaleString("en-US", { timeZone: TIMEZONE }));
  const asUtc = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess + (asUtc.getTime() - asLocal.getTime()));
}

export type DueState = "vencido" | "hoy" | "proximo";

export function dueState(due: Date, now = new Date()): DueState {
  if (due.getTime() < now.getTime()) return "vencido";
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(x);
  return day(due) === day(now) ? "hoy" : "proximo";
}
