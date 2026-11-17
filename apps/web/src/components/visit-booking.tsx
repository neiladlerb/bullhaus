"use client";
// Agendar visita sin escribirle a nadie: día, hora, datos y confirmación explícita del horario (CLAUDE.md: no se
// agenda sin nombre ni sin que la persona confirme el día y la hora). El horario queda reservado y el corredor
// confirma por WhatsApp con la dirección exacta, que nunca se muestra en la web.
import { useActionState, useEffect, useState, useTransition } from "react";
import { formatDayLong, formatTime, formatWhen, localParts, WEEKDAY_LABELS } from "@bullhaus/core";
import { readAttribution, trackVisit } from "@/components/attribution";
import { bookVisit, loadVisitSlots, type BookState, type VisitDays } from "@/lib/visits";

const shortDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { wd: WEEKDAY_LABELS[wd]!.slice(0, 3), date: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
};

export function VisitBooking({ code, brandName, brokerName }: { code: string; brandName: string; brokerName: string }) {
  const [data, setData] = useState<VisitDays | null>(null);
  const [loading, startLoading] = useTransition();
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [state, action, pending] = useActionState<BookState, FormData>(bookVisit, { ok: false, message: "" });

  const load = () =>
    startLoading(async () => {
      const d = await loadVisitSlots(code);
      setData(d);
      setDay(d.days[0]?.day ?? null);
      setSlot(null);
    });

  useEffect(() => setOrigin(JSON.stringify(readAttribution() ?? {})), []);
  useEffect(() => {
    if (state.ok) trackVisit(code);
    if (state.taken) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.ok && slot) {
    return (
      <div className="rounded-xl bg-white p-5 text-sm" role="status">
        <p className="text-base font-semibold">Visita agendada</p>
        <p className="mt-1">
          Te esperamos el <span className="font-semibold">{formatWhen(new Date(slot))}</span>.
        </p>
        <p className="mt-2 text-muted">{brokerName} te escribirá por WhatsApp para confirmarla y darte la dirección exacta.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <button type="button" onClick={load} disabled={loading} className="btn-dark w-full rounded-lg">
        {loading ? "Buscando horarios…" : "Agendar visita"}
      </button>
    );
  }

  if (!data.ok || data.days.length === 0) {
    return (
      <p className="rounded-xl bg-white p-4 text-sm">
        {data.ok ? "No quedan horarios libres en las próximas dos semanas." : "No pudimos cargar los horarios."} Escríbenos por WhatsApp o déjanos tus datos y te contactamos.
      </p>
    );
  }

  const current = data.days.find((d) => d.day === day) ?? data.days[0]!;

  if (!slot) {
    return (
      <div>
        <p className="text-sm font-semibold">Elige el día</p>
        {/* Días y horas del mismo tamaño: grilla de columnas iguales (skill diseno-bullhaus). */}
        <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Día de la visita">
          {data.days.map((d) => {
            const s = shortDay(d.day);
            const on = d.day === current.day;
            return (
              <button
                key={d.day}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDay(d.day)}
                className={`flex h-14 flex-col items-center justify-center rounded-lg border text-sm ${on ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:bg-paper"}`}
              >
                <span className="font-semibold">{s.wd}</span>
                <span className="text-xs">{s.date}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm font-semibold">Elige la hora ({data.durationMin} minutos)</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {current.slots.map((s) => (
            <button key={s} type="button" onClick={() => setSlot(s)} className="flex h-11 items-center justify-center rounded-lg border border-line-strong bg-white text-sm font-semibold hover:bg-paper">
              {formatTime(new Date(s))}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const when = new Date(slot);
  const whenText = `${WEEKDAY_LABELS[localParts(when).weekday]} ${formatDayLong(when).split(" ")[1]} a las ${formatTime(when)}`;
  return (
    <form action={action} className="grid gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm">
        <span>
          <span className="block text-xs text-muted">Horario elegido</span>
          <span className="font-semibold">{whenText}</span>
        </span>
        <button type="button" onClick={() => setSlot(null)} className="min-h-11 font-semibold text-ink underline-offset-4 hover:underline">
          Cambiar
        </button>
      </div>
      <input type="hidden" name="propertyCode" value={code} />
      <input type="hidden" name="start" value={slot} />
      <input type="hidden" name="confirmed" value="1" />
      <input type="hidden" name="attribution" value={origin} />
      <label>
        <span className="mb-1 block text-xs font-semibold text-muted">Nombre</span>
        <input name="name" required autoComplete="name" className="field" />
      </label>
      <label>
        <span className="mb-1 block text-xs font-semibold text-muted">Celular (te confirmamos por WhatsApp)</span>
        <input name="phone" required type="tel" autoComplete="tel" placeholder="+56 9" className="field" />
      </label>
      <label>
        <span className="mb-1 block text-xs font-semibold text-muted">Email (opcional)</span>
        <input name="email" type="email" autoComplete="email" className="field" />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-brand-dark" />
        Acepto que {brandName} me contacte por teléfono, WhatsApp o email para coordinar esta visita.
      </label>
      {state.message && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn-brand w-full rounded-lg" disabled={pending}>
        {pending ? "Agendando…" : `Confirmar visita el ${whenText.toLowerCase()}`}
      </button>
    </form>
  );
}
