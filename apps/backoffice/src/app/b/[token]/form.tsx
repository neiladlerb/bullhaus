"use client";
import { useActionState } from "react";
import { submitBrochureLeadAction, type BrochureFormState } from "./actions";

export function BrochureForm({ token, shareId, owner, demo }: { token: string; shareId: string | null; owner: boolean; demo: boolean }) {
  const [state, run, pending] = useActionState<BrochureFormState, FormData>(submitBrochureLeadAction.bind(null, token, shareId), null);
  if (state?.ok) return <p className="rounded-xl bg-green-50 p-5 text-green-900">{state.message}</p>;
  return (
    <form action={run} className="space-y-3">
      {demo && <p className="rounded-md bg-violet-50 px-3 py-2 text-xs text-violet-900">Brochure de demostración: el contacto queda como lead demo en el back office.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label">Nombre</span>
          <input name="name" className="input" required autoComplete="name" />
        </label>
        <label>
          <span className="label">Celular</span>
          <input name="phone" className="input" required inputMode="tel" autoComplete="tel" placeholder="+56 9 ..." />
        </label>
        <label>
          <span className="label">Email (opcional)</span>
          <input name="email" type="email" className="input" autoComplete="email" />
        </label>
        {owner && (
          <label>
            <span className="label">Comuna de tu propiedad</span>
            <input name="comuna" className="input" />
          </label>
        )}
      </div>
      <label className="block">
        <span className="label">{owner ? "Cuéntanos de tu propiedad (opcional)" : "Mensaje (opcional)"}</span>
        <textarea name="message" rows={3} className="input w-full" />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1 accent-brand" required /> Autorizo a Bull Haus a usar mis datos para contactarme por esta consulta, según su política de privacidad.
      </label>
      {state && !state.ok && <p className="text-sm text-red-700">{state.message}</p>}
      <button className="btn-brand w-full sm:w-auto" disabled={pending}>
        {pending ? "Enviando..." : owner ? "Quiero mi valorización" : "Quiero visitarla"}
      </button>
    </form>
  );
}
