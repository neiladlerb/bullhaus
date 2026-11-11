"use client";
import { useActionState, useEffect, useRef } from "react";
import { MIN_PASSWORD_LENGTH } from "@bullhaus/core";
import { changePasswordAction, type PasswordState } from "./actions";

const initial: PasswordState = { ok: false, message: "" };

export function PasswordForm({ pending: mustChange }: { pending: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid max-w-md gap-4">
      <div>
        <label className="label" htmlFor="current">{mustChange ? "Contraseña temporal" : "Contraseña actual"}</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="next">Nueva contraseña</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="input" aria-describedby="next-help" />
        <p id="next-help" className="mt-1 text-xs text-muted">
          Al menos {MIN_PASSWORD_LENGTH} caracteres. Una frase de varias palabras es más segura y fácil de recordar.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repite la nueva contraseña</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="input" />
      </div>
      {state.message && (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p>
      )}
      <div>
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Cambiar contraseña"}</button>
      </div>
    </form>
  );
}
