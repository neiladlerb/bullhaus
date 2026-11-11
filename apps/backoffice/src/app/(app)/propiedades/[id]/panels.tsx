"use client";
import { useActionState, useRef, useEffect, useState, useTransition } from "react";
import { addMandateAction, uploadPhotosAction, type FormState } from "../actions";

const initial: FormState = { ok: false, message: "" };

function Status({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p>;
}

// Vercel corta las peticiones sobre 4,5 MB. Antes de subir, el navegador reduce cada foto
// a 2400 px de lado mayor (el servidor guarda hasta 2000 px) y la envía en su propia petición.
const MAX_SIDE = 2400;
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_REQUEST_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.9));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Formato que el navegador no sabe abrir (por ejemplo HEIC): se envía tal cual.
    return file;
  }
}

export function PhotoUpload({ propertyId }: { propertyId: string }) {
  const [state, setState] = useState<FormState>(initial);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("photos");
    const files = input instanceof HTMLInputElement && input.files ? [...input.files] : [];
    if (files.length === 0) {
      setState({ ok: false, message: "Elige al menos una foto." });
      return;
    }
    startTransition(async () => {
      let saved = 0;
      const failed: string[] = [];
      for (const [i, original] of files.entries()) {
        setState({ ok: true, message: `Subiendo ${i + 1} de ${files.length}…` });
        const file = await shrink(original);
        if (file.size > MAX_REQUEST_BYTES) {
          failed.push(original.name);
          continue;
        }
        const fd = new FormData();
        fd.set("propertyId", propertyId);
        fd.set("photos", file);
        try {
          const res = await uploadPhotosAction(initial, fd);
          if (res.ok) saved++;
          else failed.push(original.name);
        } catch {
          failed.push(original.name);
        }
      }
      const msg = `${saved} foto${saved === 1 ? "" : "s"} subida${saved === 1 ? "" : "s"}.`;
      setState(
        failed.length
          ? { ok: saved > 0, message: `${msg} No se pudieron subir: ${failed.join(", ")} (usa JPG, PNG o WebP).` }
          : { ok: true, message: msg },
      );
      if (failed.length === 0) ref.current?.reset();
    });
  }

  return (
    <form ref={ref} onSubmit={onSubmit} className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
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
      <div className="sm:col-span-2 lg:col-span-4"><label className="label" htmlFor="file">Mandato firmado (PDF de hasta 4 MB, se guarda en el almacenamiento privado)</label><input id="file" name="file" type="file" accept="application/pdf" className="text-sm" /></div>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Registrar mandato"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}
