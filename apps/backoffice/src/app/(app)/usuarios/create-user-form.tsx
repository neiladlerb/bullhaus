"use client";
import { useActionState, useEffect, useRef } from "react";
import { ROLES, ROLE_LABELS } from "@bullhaus/core";
import { createUserAction } from "./actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, { ok: false, message: "" });
  const v = (k: string) => state.values?.[k] ?? (k === "role" ? "corredor" : "");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form key={state.values ? JSON.stringify(state.values) : "vacio"} ref={ref} action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" defaultValue={v("name")} className="input" required /></div>
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" defaultValue={v("email")} type="email" className="input" required /></div>
      <div><label className="label" htmlFor="phone">Celular</label><input id="phone" name="phone" defaultValue={v("phone")} placeholder="+56 9 …" className="input" /></div>
      <div>
        <label className="label" htmlFor="role">Rol</label>
        <select id="role" name="role" defaultValue={v("role")} className="input">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>
      <div><label className="label" htmlFor="password">Contraseña inicial</label><input id="password" name="password" type="password" minLength={12} autoComplete="new-password" className="input" required /></div>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-5">
        <button className="btn-primary" disabled={pending}>{pending ? "Creando…" : "Crear usuario"}</button>
        {state.message && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p>}
      </div>
    </form>
  );
}
