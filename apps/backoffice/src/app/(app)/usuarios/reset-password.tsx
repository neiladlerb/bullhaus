"use client";
import { useActionState, useState } from "react";
import { resetPasswordAction, type ResetState } from "./actions";

const initial: ResetState = { ok: false, message: "" };

export function ResetPassword({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const [copied, setCopied] = useState(false);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-2">
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm(`¿Restablecer la contraseña de ${name}? Se cerrarán todas sus sesiones.`)) e.preventDefault();
          setCopied(false);
        }}
      >
        <input type="hidden" name="id" value={userId} />
        <button className="text-xs text-muted underline underline-offset-2 hover:text-ink" disabled={pending}>
          {pending ? "Restableciendo…" : "Restablecer contraseña"}
        </button>
      </form>
      {state.message && (
        <div className={`mt-2 max-w-sm rounded-md border p-3 text-xs ${state.ok ? "border-line bg-white" : "border-red-200 text-red-700"}`} role="status">
          <p>{state.message}</p>
          {state.temporary && (
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded bg-stone-100 px-2 py-1 font-mono text-sm tracking-wide">{state.temporary}</code>
              <button type="button" className="btn-ghost py-1 text-xs" onClick={() => copy(state.temporary!)}>
                {copied ? "Copiada" : "Copiar"}
              </button>
            </div>
          )}
          {state.temporary && <p className="mt-2 text-muted">No se vuelve a mostrar: si la pierdes, restablécela otra vez.</p>}
        </div>
      )}
    </div>
  );
}
