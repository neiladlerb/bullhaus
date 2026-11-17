"use server";
import { z } from "zod";
import { AttributionSchema } from "@bullhaus/core";
import { BACKOFFICE_URL, getBrand } from "./api";

// Agendar visita desde la ficha: la web pide los horarios libres y toma uno a través del back office (servidor a
// servidor, con WEB_API_KEY; la clave nunca llega al navegador).

export interface VisitDays {
  ok: boolean;
  durationMin: number;
  days: { day: string; slots: string[] }[];
}

export async function loadVisitSlots(code: string): Promise<VisitDays> {
  try {
    const res = await fetch(`${BACKOFFICE_URL}/api/publico/visitas?codigo=${encodeURIComponent(code)}`, {
      headers: { "x-web-key": process.env.WEB_API_KEY ?? "" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, durationMin: 0, days: [] };
    const data = (await res.json()) as { durationMin: number; days: { day: string; slots: string[] }[] };
    return { ok: true, ...data };
  } catch {
    return { ok: false, durationMin: 0, days: [] };
  }
}

export interface BookState {
  ok: boolean;
  message: string;
  /** El horario se ocupó mientras la persona llenaba sus datos: hay que volver a elegir. */
  taken?: boolean;
}

const schema = z.object({
  propertyCode: z.string().trim().min(1).max(40),
  start: z.string().datetime({ message: "Elige un horario" }),
  name: z.string().trim().min(2, "Escribe tu nombre"),
  phone: z.string().trim().min(8, "Escribe un celular válido").regex(/^[+\d\s()-]+$/, "Escribe un celular válido"),
  email: z.string().trim().email("Escribe un email válido").optional().or(z.literal("")),
  consent: z.literal("on", { errorMap: () => ({ message: "Debes aceptar que te contactemos para coordinar la visita" }) }),
  confirmed: z.literal("1", { errorMap: () => ({ message: "Confirma el día y la hora de la visita" }) }),
  website: z.string().max(0).optional(),
  attribution: z.string().max(2000).optional(),
});

export async function bookVisit(_prev: BookState, form: FormData): Promise<BookState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  const { consent: _c, confirmed: _k, website: _w, attribution: raw, ...data } = parsed.data;
  let attribution: unknown;
  try {
    const r = raw ? AttributionSchema.safeParse(JSON.parse(raw)) : null;
    attribution = r?.success && Object.keys(r.data).length ? r.data : undefined;
  } catch {
    attribution = undefined;
  }
  try {
    const res = await fetch(`${BACKOFFICE_URL}/api/publico/visitas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-web-key": process.env.WEB_API_KEY ?? "" },
      body: JSON.stringify({ ...data, attribution, consent: true, confirmed: true }),
      cache: "no-store",
    });
    if (res.status === 409) return { ok: false, taken: true, message: "Alguien acaba de tomar ese horario. Elige otro, por favor." };
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    const brand = await getBrand();
    return { ok: false, message: brand.contact.whatsapp ? `No pudimos agendar la visita. Escríbenos por WhatsApp al ${brand.contact.whatsapp}.` : "No pudimos agendar la visita. Inténtalo de nuevo en unos minutos." };
  }
  return { ok: true, message: "" };
}
