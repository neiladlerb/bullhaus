"use server";
import { z } from "zod";
import { BACKOFFICE_URL } from "./api";

export interface ContactState {
  ok: boolean;
  message: string;
}

const schema = z.object({
  kind: z.enum(["comprador", "arrendatario", "propietario"]),
  name: z.string().trim().min(2, "Escribe tu nombre"),
  phone: z
    .string()
    .trim()
    .min(8, "Escribe un celular válido")
    .regex(/^[+\d\s()-]+$/, "Escribe un celular válido"),
  email: z.string().trim().email("Escribe un email válido").optional().or(z.literal("")),
  comuna: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1500).optional(),
  propertyCode: z.string().trim().max(40).optional(),
  consent: z.literal("on", { errorMap: () => ({ message: "Debes aceptar que te contactemos" }) }),
  // Campo trampa para bots: las personas no lo ven.
  website: z.string().max(0).optional(),
});

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  const { consent: _c, website: _w, ...data } = parsed.data;
  try {
    const res = await fetch(`${BACKOFFICE_URL}/api/publico/contacto`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-web-key": process.env.WEB_API_KEY ?? "" },
      body: JSON.stringify({ ...data, consent: true }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    return { ok: false, message: "No pudimos enviar tu mensaje. Escríbenos por WhatsApp al +56 9 9200 0211." };
  }
  return {
    ok: true,
    message: data.kind === "propietario" ? "¡Gracias! Un corredor te contactará para coordinar la visita de valorización." : "¡Gracias! Un corredor te contactará a la brevedad.",
  };
}
