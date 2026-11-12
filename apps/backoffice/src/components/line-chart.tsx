// Gráfico de línea en SVG, sin librerías. Se adapta al ancho del contenedor.
export function LineChart({ points, height = 140, format = (n: number) => n.toLocaleString("es-CL"), labels }: { points: number[]; height?: number; format?: (n: number) => string; labels?: [string, string] }) {
  if (points.length < 2) return <p className="text-sm text-muted">Sin datos suficientes.</p>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 600;
  const y = (v: number) => height - 8 - ((v - min) / span) * (height - 24);
  const d = points.map((v, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" preserveAspectRatio="none" role="img" aria-label={`De ${format(points[0]!)} a ${format(points[points.length - 1]!)}`}>
        <path d={`${d} L${w},${height} L0,${height} Z`} className="fill-brand/10" />
        <path d={d} className="fill-none stroke-brand" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{labels?.[0]} · {format(points[0]!)}</span>
        <span>{labels?.[1]} · {format(points[points.length - 1]!)}</span>
      </div>
    </div>
  );
}

/** Columnas dobles por semana (p. ej. inversión vs. contactos). */
export function PairColumns({ rows, aLabel, bLabel, formatA, formatB }: { rows: { label: string; a: number; b: number }[]; aLabel: string; bLabel: string; formatA: (n: number) => string; formatB: (n: number) => string }) {
  const maxA = Math.max(1, ...rows.map((r) => r.a));
  const maxB = Math.max(1, ...rows.map((r) => r.b));
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex h-full flex-1 items-end justify-center gap-0.5" title={`${r.label}: ${formatA(r.a)} · ${formatB(r.b)}`}>
            <div className="w-1/2 rounded-t bg-ink/60" style={{ height: `${(r.a / maxA) * 100}%` }} />
            <div className="w-1/2 rounded-t bg-brand" style={{ height: `${(r.b / maxB) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {rows.map((r) => (
          <span key={r.label} className="flex-1 text-center text-[10px] text-muted">{r.label}</span>
        ))}
      </div>
      <p className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-sm bg-ink/60" /> {aLabel}</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-sm bg-brand" /> {bLabel}</span>
      </p>
    </div>
  );
}
