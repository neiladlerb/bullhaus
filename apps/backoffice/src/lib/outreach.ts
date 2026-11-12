import "server-only";
import { formatDateTimeCl, renderMessage, templateFor, type ContactTemplate } from "@bullhaus/core";

// Mensajes prearmados para un lead: los arma el sistema y los envía el corredor desde su WhatsApp
// o su correo. Con un lead de demostración nunca se abre WhatsApp ni el correo: se muestra una
// simulación del envío, porque los datos del contacto son ficticios.

export interface LeadForMessage {
  name: string;
  phone: string | null;
  email: string | null;
  kind: "comprador" | "arrendatario" | "propietario";
  property: { code: string } | null;
}

export function composeMessage(template: ContactTemplate, lead: LeadForMessage, broker: string, extra: { fecha?: Date | null; enlace?: string | null } = {}) {
  const vars = { nombre: lead.name, corredor: broker, propiedad: lead.property ? `la propiedad ${lead.property.code}` : null, fecha: extra.fecha ? formatDateTimeCl(extra.fecha) : null, enlace: extra.enlace ?? null };
  return { subject: template.subject, body: renderMessage(template.body, vars) };
}

export function composeByKey(key: string | null | undefined, lead: LeadForMessage, broker: string, extra: { fecha?: Date | null; enlace?: string | null } = {}) {
  const t = templateFor(key) ?? templateFor("primer_contacto")!;
  return composeMessage(t, lead, broker, extra);
}

/** Página de simulación del envío (solo demo). */
export function demoSendUrl(params: { channel: string; to: string; subject?: string; text: string; share?: string; back: string }): string {
  const q = new URLSearchParams({ canal: params.channel, para: params.to, texto: params.text, volver: params.back });
  if (params.subject) q.set("asunto", params.subject);
  if (params.share) q.set("envio", params.share);
  return `/envio-demo?${q.toString()}`;
}
