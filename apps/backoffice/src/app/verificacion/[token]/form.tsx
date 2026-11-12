"use client";
import { useActionState, useState } from "react";
import { submitKycAction, type PortalState } from "./actions";

export function PortalForm({ token, demo, buyer, nationality }: { token: string; demo: boolean; buyer: boolean; nationality: string }) {
  const [state, run, pending] = useActionState<PortalState, FormData>(submitKycAction.bind(null, token), null);
  const [pep, setPep] = useState("no");
  const [scanned, setScanned] = useState(false);
  if (state?.ok) return <p className="rounded-lg bg-green-50 p-5 text-green-900">{state.message}</p>;
  return (
    <form action={run} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">1. Consentimientos</legend>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="consent" className="mt-1 accent-brand" required /> Autorizo a Bull Haus a tratar mis datos para la verificación de identidad que exige la Ley 19.913.
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="biometricConsent" className="mt-1 accent-brand" required /> Acepto, en forma expresa y separada, el tratamiento de mi biometría (selfie y prueba de vida) solo para esta verificación.
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">2. Carnet y prueba de vida</legend>
        <p className="text-sm text-muted">El proveedor de verificación te pedirá una foto del carnet por ambos lados y una selfie. Las imágenes no llegan a Bull Haus.</p>
        {demo ? (
          <button type="button" onClick={() => setScanned(true)} className={scanned ? "btn-ghost" : "btn-primary"}>
            {scanned ? "✓ Verificación simulada lista" : "Simular verificación (demo, sin subir nada)"}
          </button>
        ) : (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">La verificación con el proveedor todavía no está disponible.</p>
        )}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 font-semibold">3. Tus datos</legend>
        <label>
          <span className="label">Nacionalidad</span>
          <input name="nationality" className="input" defaultValue={nationality} required />
        </label>
        <label>
          <span className="label">Profesión u oficio</span>
          <input name="profession" className="input" required />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Domicilio</span>
          <input name="address" className="input" required />
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">4. Declaraciones</legend>
        <p className="text-sm">¿Eres o has sido en el último año una persona expuesta políticamente (PEP), o familiar directo de una?</p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" name="pep" value="no" checked={pep === "no"} onChange={() => setPep("no")} className="accent-brand" /> No</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="pep" value="si" checked={pep === "si"} onChange={() => setPep("si")} className="accent-brand" /> Sí</label>
        </div>
        {pep === "si" && <input name="pepRole" className="input" placeholder="Cargo o relación" />}
        {buyer && (
          <label className="block pt-2">
            <span className="label">Origen de los fondos con que pagarás</span>
            <input name="fundsOrigin" className="input" placeholder="Ej.: ahorros y crédito hipotecario" />
          </label>
        )}
      </fieldset>

      {state && !state.ok && <p className="text-sm text-red-700">{state.message}</p>}
      <button className="btn-brand w-full" disabled={pending || (demo && !scanned) || !demo}>
        {pending ? "Enviando…" : "Enviar verificación"}
      </button>
    </form>
  );
}
