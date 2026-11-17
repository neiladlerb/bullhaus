"use client";
import { useActionState } from "react";
import { importAction } from "./actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importAction, { message: "" });
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <input name="file" type="file" accept=".xlsx,.csv" required aria-label="Archivo de la planilla" className="w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line-strong file:bg-white file:px-3 file:text-sm file:font-semibold" />
      <button className="btn-brand" disabled={pending}>{pending ? "Importando…" : "Importar planilla"}</button>
      {state.message && <p className="text-sm text-danger" role="alert">{state.message}</p>}
    </form>
  );
}
