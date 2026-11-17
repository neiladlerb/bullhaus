"use client";
import { useActionState, useState } from "react";
import { APPOINTMENT_KIND_LABELS, APPOINTMENT_KINDS, WEEKDAY_LABELS, type AppointmentKind, type WeeklyAvailability } from "@bullhaus/core";
import { createAppointmentAction, saveAvailabilityAction, type AgendaFormState } from "./actions";

const initial: AgendaFormState = { ok: false, message: "" };

export function NewAppointmentForm({
  today,
  defaultMinutes,
  properties,
  brokers,
}: {
  today: string;
  defaultMinutes: number;
  properties: { id: string; label: string }[];
  /** Solo para administración: elegir en la agenda de qué corredor queda. */
  brokers: { id: string; name: string }[] | null;
}) {
  const [state, action, pending] = useActionState(createAppointmentAction, initial);
  const [kind, setKind] = useState<AppointmentKind>("visita");
  const needsContact = kind === "visita" || kind === "tasacion" || kind === "llamada";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="label" htmlFor="ap-kind">Tipo</label>
        <select id="ap-kind" name="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as AppointmentKind)}>
          {APPOINTMENT_KINDS.map((k) => (
            <option key={k} value={k}>{APPOINTMENT_KIND_LABELS[k]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="ap-date">Día</label>
        <input id="ap-date" name="date" type="date" required min={today} defaultValue={today} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="ap-time">Hora</label>
        <input id="ap-time" name="time" type="time" required step={900} defaultValue="11:00" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="ap-min">Duración (minutos)</label>
        <input id="ap-min" name="minutes" type="number" min={15} max={480} step={15} defaultValue={defaultMinutes} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="ap-prop">Propiedad {kind === "visita" ? "" : "(opcional)"}</label>
        <select id="ap-prop" name="propertyId" className="input" required={kind === "visita"} defaultValue="">
          <option value="">Sin propiedad</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>
      {brokers && (
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ap-broker">Corredor</label>
          <select id="ap-broker" name="brokerId" className="input" defaultValue="">
            <option value="">Yo</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}
      {needsContact && (
        <>
          <div>
            <label className="label" htmlFor="ap-name">Nombre del contacto</label>
            <input id="ap-name" name="contactName" className="input" required={kind === "visita"} maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="ap-phone">Celular</label>
            <input id="ap-phone" name="contactPhone" type="tel" className="input" placeholder="+56 9 1234 5678" maxLength={30} />
          </div>
        </>
      )}
      {!needsContact && (
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ap-title">Asunto</label>
          <input id="ap-title" name="title" className="input" maxLength={120} placeholder="Ej.: firma de promesa en notaría" />
        </div>
      )}
      <div className="sm:col-span-2 lg:col-span-4">
        <label className="label" htmlFor="ap-notes">Notas internas</label>
        <textarea id="ap-notes" name="notes" rows={2} className="input" maxLength={1000} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button className="btn-brand" disabled={pending}>{pending ? "Guardando…" : "Guardar cita"}</button>
        {state.message && (
          <p role="alert" className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}

const ORDER = ["1", "2", "3", "4", "5", "6", "0"] as const;

export function AvailabilityForm({ value }: { value: WeeklyAvailability }) {
  const [state, action, pending] = useActionState(saveAvailabilityAction, initial);
  return (
    <form action={action}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="w-32 py-2 pr-4 font-medium">Día</th>
              <th className="py-2 pr-4 font-medium">Mañana</th>
              <th className="py-2 font-medium">Tarde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ORDER.map((d) => {
              const [a, b] = value[d];
              return (
                <tr key={d}>
                  <th scope="row" className="py-3 pr-4 text-left font-semibold">{WEEKDAY_LABELS[Number(d)]}</th>
                  {[a, b].map((r, i) => {
                    const [from, to] = r ? r.split("-") : ["", ""];
                    const slot = i === 0 ? "a" : "b";
                    return (
                      <td key={slot} className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <input aria-label={`${WEEKDAY_LABELS[Number(d)]}, ${i === 0 ? "mañana" : "tarde"}, desde`} name={`${d}-${slot}-from`} type="time" step={900} defaultValue={from} className="input w-32" />
                          <span className="text-muted">a</span>
                          <input aria-label={`${WEEKDAY_LABELS[Number(d)]}, ${i === 0 ? "mañana" : "tarde"}, hasta`} name={`${d}-${slot}-to`} type="time" step={900} defaultValue={to} className="input w-32" />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">Deja un tramo vacío si ese día no atiendes. Para borrar un tramo, borra las dos horas.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn-brand" disabled={pending}>{pending ? "Guardando…" : "Guardar horario"}</button>
        {state.message && <p role="alert" className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
