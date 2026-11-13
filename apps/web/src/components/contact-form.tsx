"use client";
import { useActionState, useEffect, useState } from "react";
import { readAttribution, trackLead } from "@/components/attribution";
import { sendContact, type ContactState } from "@/lib/contact";

export function ContactForm({
  kind,
  propertyCode,
  showKind = false,
  submitLabel = "Enviar",
  messagePlaceholder = "¿En qué te podemos ayudar?",
  dark = false,
}: {
  kind: "comprador" | "arrendatario" | "propietario";
  propertyCode?: string;
  showKind?: boolean;
  submitLabel?: string;
  messagePlaceholder?: string;
  dark?: boolean;
}) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { ok: false, message: "" });
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(JSON.stringify(readAttribution() ?? {})), []);
  useEffect(() => {
    if (state.ok) trackLead(state.kind ?? kind);
  }, [state.ok, state.kind, kind]);
  if (state.ok) {
    return <p className={`rounded-xl p-5 text-sm ${dark ? "bg-white/10 text-white" : "bg-sand"}`}>{state.message}</p>;
  }
  const label = `mb-1 block text-xs font-semibold ${dark ? "text-white/70" : "text-muted"}`;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {propertyCode && <input type="hidden" name="propertyCode" value={propertyCode} />}
      <input type="hidden" name="attribution" value={origin} />
      {showKind ? (
        <label className="sm:col-span-2">
          <span className={label}>Quiero</span>
          <select name="kind" defaultValue={kind} className="field">
            <option value="comprador">Comprar</option>
            <option value="arrendatario">Arrendar</option>
            <option value="propietario">Vender o arrendar mi propiedad</option>
          </select>
        </label>
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}
      <label>
        <span className={label}>Nombre</span>
        <input name="name" required autoComplete="name" className="field" />
      </label>
      <label>
        <span className={label}>Celular</span>
        <input name="phone" required type="tel" autoComplete="tel" placeholder="+56 9" className="field" />
      </label>
      <label>
        <span className={label}>Email (opcional)</span>
        <input name="email" type="email" autoComplete="email" className="field" />
      </label>
      <label>
        <span className={label}>Comuna</span>
        <input name="comuna" className="field" />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>Mensaje</span>
        <textarea name="message" rows={3} placeholder={messagePlaceholder} className="field" />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className={`flex items-start gap-2 text-xs sm:col-span-2 ${dark ? "text-white/70" : "text-muted"}`}>
        <input type="checkbox" name="consent" required className="mt-0.5 accent-[#ea2b94]" />
        Acepto que Bull Haus me contacte por teléfono, WhatsApp o email para responder esta consulta.
      </label>
      {state.message && <p className="text-sm text-red-600 sm:col-span-2">{state.message}</p>}
      <div className="sm:col-span-2">
        <button className="btn-brand w-full sm:w-auto" disabled={pending}>
          {pending ? "Enviando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
