// Barras horizontales simples, sin librería de gráficos. Cada fila muestra su valor.
export function Bars({ rows, format = (n) => n.toLocaleString("es-CL") }: { rows: { label: string; value: number; hint?: string; accent?: boolean }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,7.5rem)_minmax(3rem,1fr)_auto] items-center gap-3 text-sm">
          <span className="truncate text-muted" title={r.label}>
            {r.label}
          </span>
          <span className="block h-2.5 overflow-hidden rounded-full bg-paper">
            <span className={`block h-full rounded-full ${r.accent ? "bg-brand" : "bg-ink/70"}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="tabular-nums">
            {format(r.value)}
            {r.hint && <span className="ml-1 text-xs text-muted">{r.hint}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Columnas por semana: altura proporcional, etiqueta con el total. */
export function WeekColumns({ weeks }: { weeks: { label: string; social: number; other: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.social + w.other));
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {weeks.map((w) => (
          <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${w.label}: ${w.social} de redes, ${w.other} de otras fuentes`}>
            <span className="text-[10px] tabular-nums text-muted">{w.social + w.other}</span>
            <div className="flex w-full flex-col justify-end overflow-hidden rounded-t" style={{ height: `calc((100% - 1rem) * ${(w.social + w.other) / max})` }}>
              <div className="bg-brand" style={{ flex: w.social }} />
              <div className="bg-ink/25" style={{ flex: w.other }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {weeks.map((w) => (
          <span key={w.label} className="flex-1 text-center text-[10px] text-muted">
            {w.label}
          </span>
        ))}
      </div>
      <p className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm bg-brand" /> Redes sociales
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm bg-ink/25" /> Otras fuentes
        </span>
      </p>
    </div>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
