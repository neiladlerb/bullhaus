"use client";
import { useActionState, useRef, useEffect } from "react";
import { addMandateAction, uploadPhotosAction, type FormState } from "../actions";

const initial: FormState = { ok: false, message: "" };

function Status({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p>;
}

export function PhotoUpload({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useActionState(uploadPhotosAction, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input name="photos" type="file" accept="image/*" multiple className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm" />
      <button className="btn-primary" disabled={pending}>{pending ? "Subiendo…" : "Subir fotos"}</button>
      <Status state={state} />
    </form>
  );
}

export function MandateForm({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useActionState(addMandateAction, initial);
  const v = (k: string) => state.values?.[k] ?? (k === "exclusive" ? "si" : "");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form key={state.values ? JSON.stringify(state.values) : "vacio"} ref={ref} action={action} className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <p className="text-sm font-medium sm:col-span-2 lg:col-span-4">Registrar mandato</p>
      <div className="sm:col-span-2"><label className="label" htmlFor="ownerName">Propietario</label><input id="ownerName" name="ownerName" defaultValue={v("ownerName")} className="input" required /></div>
      <div><label className="label" htmlFor="ownerRut">RUT</label><input id="ownerRut" name="ownerRut" defaultValue={v("ownerRut")} placeholder="12.345.678-5" className="input" required /></div>
      <div><label className="label" htmlFor="exclusive">Exclusivo</label><select id="exclusive" name="exclusive" defaultValue={v("exclusive")} className="input"><option value="si">Sí</option><option value="no">No</option></select></div>
      <div><label className="label" htmlFor="ownerEmail">Email</label><input id="ownerEmail" name="ownerEmail" defaultValue={v("ownerEmail")} type="email" className="input" /></div>
      <div><label className="label" htmlFor="ownerPhone">Celular</label><input id="ownerPhone" name="ownerPhone" defaultValue={v("ownerPhone")} placeholder="+56 9 …" className="input" /></div>
      <div><label className="label" htmlFor="commissionPct">Comisión (%)</label><input id="commissionPct" name="commissionPct" defaultValue={v("commissionPct")} placeholder="2" className="input" required /></div>
      <div><label className="label" htmlFor="signedAt">Firmado el</label><input id="signedAt" name="signedAt" defaultValue={v("signedAt")} placeholder="dd/mm/aaaa" className="input" required /></div>
      <div><label className="label" htmlFor="expiresAt">Vence el</label><input id="expiresAt" name="expiresAt" defaultValue={v("expiresAt")} placeholder="dd/mm/aaaa" className="input" required /></div>
      <div className="sm:col-span-2 lg:col-span-3"><label className="label" htmlFor="commissionTerms">Condiciones de la comisión</label><input id="commissionTerms" name="commissionTerms" defaultValue={v("commissionTerms")} placeholder="Más IVA, se devenga a la firma de la escritura…" className="input" /></div>
      <div className="sm:col-span-2 lg:col-span-4"><label className="label" htmlFor="file">Mandato firmado (PDF, se guarda en el almacenamiento privado)</label><input id="file" name="file" type="file" accept="application/pdf" className="text-sm" /></div>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Registrar mandato"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}
