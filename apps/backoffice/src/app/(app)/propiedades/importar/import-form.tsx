"use client";
import { useActionState } from "react";
import { importAction } from "./actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importAction, { message: "" });
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input name="file" type="file" accept=".xlsx,.csv" required className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm" />
      <button className="btn-brand" disabled={pending}>{pending ? "Importando…" : "Importar"}</button>
      {state.message && <p className="text-sm text-red-700" role="alert">{state.message}</p>}
    </form>
  );
}
