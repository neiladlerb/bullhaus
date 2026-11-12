"use client";
import { useActionState } from "react";
import type { ActionState } from "./actions";

/** Botón de una acción de servidor que muestra su resultado (p. ej. el bloqueo por KYC). */
export function StateButton({ action, label, variant = "btn-primary" }: { action: (prev: ActionState) => Promise<ActionState>; label: string; variant?: string }) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <form action={run} className="inline-flex flex-col items-start gap-1">
      <button className={variant} disabled={pending}>
        {pending ? "Procesando…" : label}
      </button>
      {state && <span className={`max-w-sm text-xs ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</span>}
    </form>
  );
}
