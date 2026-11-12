import "server-only";

// Proveedores externos. La regla que ordena demo y producción:
// - un registro de demostración (isDemo) solo pasa por el proveedor simulado,
// - un registro real solo pasa por el proveedor real, y si no está conectado, la acción se bloquea.
// Así la demo nunca toca un servicio real y un cliente real nunca recibe un resultado inventado.

export class ProviderNotConnected extends Error {
  constructor(name: string) {
    super(`${name} todavía no está conectado. Mientras tanto, esta acción solo funciona con datos de demostración.`);
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export interface KycVerification {
  provider: string;
  providerRef: string;
  identityVerified: boolean;
  livenessPassed: boolean;
  listsClear: boolean;
}

/** Verificación de identidad y listas. En la demo no se sube ni se procesa ningún documento. */
export function verifyIdentity(record: { id: string; isDemo: boolean }): KycVerification {
  if (!record.isDemo) throw new ProviderNotConnected("El proveedor de verificación de identidad");
  const h = hash(record.id);
  return { provider: "simulado", providerRef: `SIM-${(h % 900000) + 100000}`, identityVerified: h % 17 !== 0, livenessPassed: h % 23 !== 0, listsClear: h % 41 !== 0 };
}

/** Emisión de un documento tributario. En la demo el folio es ficticio y nada llega al SII. */
export async function emitTaxDocument(record: { isDemo: boolean }, nextFolio: () => Promise<number>): Promise<{ provider: string; folio: number }> {
  if (!record.isDemo) throw new ProviderNotConnected("El proveedor de facturación electrónica");
  return { provider: "simulado", folio: await nextFolio() };
}

/** Envío a firma electrónica. */
export function sendToSignature(record: { isDemo: boolean }): { provider: string } {
  if (!record.isDemo) throw new ProviderNotConnected("El proveedor de firma electrónica");
  return { provider: "simulado" };
}

/** Respuesta a un contacto por WhatsApp o Instagram. En la demo el mensaje se guarda pero no se envía. */
export function sendChannelMessage(record: { isDemo: boolean }): { sent: boolean } {
  if (!record.isDemo) throw new ProviderNotConnected("WhatsApp Cloud API");
  return { sent: false };
}

/** Publicación en una red social (LinkedIn, Instagram, Facebook). Solo se llama con el post ya aprobado por una persona. */
export function publishSocialPost(record: { isDemo: boolean }, platform: "instagram" | "facebook" | "linkedin"): { provider: string } {
  if (!record.isDemo) throw new ProviderNotConnected(platform === "linkedin" ? "LinkedIn" : "Meta (Instagram y Facebook)");
  return { provider: "simulado" };
}
