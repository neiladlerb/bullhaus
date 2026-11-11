"use client";
import { useActionState } from "react";
import { CURRENCIES, OPERATIONS, PETS, PROPERTY_STATUSES, PROPERTY_TYPES, STATUS_LABELS, TYPE_LABELS } from "@bullhaus/core";
import { savePropertyAction, type FormState } from "./actions";

export type PropertyFormValues = Partial<Record<string, string>>;

interface Props {
  id?: string;
  values: PropertyFormValues;
  brokers: { email: string; name: string }[];
  lockBroker: boolean;
  readOnly: boolean;
}

const initial: FormState = { ok: false, message: "" };

export function PropertyForm({ id, values, brokers, lockBroker, readOnly }: Props) {
  const [state, action, pending] = useActionState(savePropertyAction, initial);
  const err = (k: string) => state.fieldErrors?.[k]?.join(" ");
  const shown: PropertyFormValues = state.values ?? values;

  const field = (name: string, label: string, opts: { type?: string; placeholder?: string; span?: string } = {}) => (
    <div className={opts.span}>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={opts.type ?? "text"} defaultValue={shown[name] ?? ""} placeholder={opts.placeholder} className="input" disabled={readOnly} aria-invalid={!!err(name)} />
      {err(name) && <p className="mt-1 text-xs text-red-700">{err(name)}</p>}
    </div>
  );

  const select = (name: string, label: string, options: readonly string[], labels?: Record<string, string>, allowEmpty = false) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={shown[name] ?? ""} className="input" disabled={readOnly}>
        {allowEmpty && <option value="">Sin dato</option>}
        {options.map((o) => (
          <option key={o} value={o}>{labels?.[o] ?? o}</option>
        ))}
      </select>
      {err(name) && <p className="mt-1 text-xs text-red-700">{err(name)}</p>}
    </div>
  );

  return (
    <form key={state.values ? JSON.stringify(state.values) : "inicial"} action={action} className="space-y-8">
      {id && <input type="hidden" name="id" value={id} />}
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-3 text-sm font-semibold">Datos principales</legend>
        {field("code", "Código", { placeholder: "109.751" })}
        {select("operation", "Operación", OPERATIONS, { venta: "Venta", arriendo: "Arriendo" })}
        {select("type", "Tipo", PROPERTY_TYPES, TYPE_LABELS)}
        {select("status", "Estado", PROPERTY_STATUSES, STATUS_LABELS)}
        {field("comuna", "Comuna", { placeholder: "Lo Barnechea" })}
        {field("sector", "Sector", { placeholder: "La Dehesa" })}
        {field("price", "Precio", { placeholder: "18.500" })}
        {select("currency", "Moneda", CURRENCIES)}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-3 text-sm font-semibold">Características</legend>
        {field("m2Useful", "m² útiles")}
        {field("m2Land", "m² terreno")}
        {field("bedrooms", "Dormitorios")}
        {field("bathrooms", "Baños")}
        {field("parking", "Estacionamientos")}
        {field("storage", "Bodegas")}
        {field("commonExpensesClp", "Gastos comunes ($)", { placeholder: "180.000" })}
        {field("availableFrom", "Disponible desde", { placeholder: "dd/mm/aaaa" })}
        {select("pets", "Mascotas", PETS, { si: "Sí", no: "No", consultar: "Consultar" }, true)}
        {select("furnished", "Amoblado", ["si", "no"], { si: "Sí", no: "No" }, true)}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Gestión</legend>
        <div>
          <label className="label" htmlFor="brokerEmail">Corredor asignado</label>
          {lockBroker ? (
            <>
              <input type="hidden" name="brokerEmail" value={shown.brokerEmail ?? ""} />
              <input id="brokerEmail" className="input" value={brokers.find((b) => b.email === shown.brokerEmail)?.name ?? shown.brokerEmail ?? ""} disabled />
            </>
          ) : (
            <select id="brokerEmail" name="brokerEmail" defaultValue={shown.brokerEmail ?? ""} className="input" disabled={readOnly}>
              {brokers.map((b) => (
                <option key={b.email} value={b.email}>{b.name} · {b.email}</option>
              ))}
            </select>
          )}
          {err("brokerEmail") && <p className="mt-1 text-xs text-red-700">{err("brokerEmail")}</p>}
        </div>
        {select("publishWeb", "Publicar en la web", ["no", "si"], { si: "Sí", no: "No" })}
        {field("addressPrivate", "Dirección exacta (uso interno, nunca se publica)", { span: "sm:col-span-2" })}
        {field("instagramUrl", "Post de Instagram", { placeholder: "https://www.instagram.com/p/…" })}
        {field("adIds", "Ids de anuncios de Meta", { placeholder: "Separados por coma" })}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Descripción aprobada</label>
          <textarea id="description" name="description" rows={6} defaultValue={shown.description ?? ""} className="input" disabled={readOnly} />
          <p className="mt-1 text-xs text-muted">Solo datos confirmados por el corredor. Lo que no esté aquí, los agentes no lo dirán.</p>
        </div>
      </fieldset>

      {!readOnly && (
        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Guardando…" : id ? "Guardar cambios" : "Crear propiedad"}
          </button>
          {state.message && (
            <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p>
          )}
        </div>
      )}
    </form>
  );
}
