import Link from "next/link";
import { SALES_PROCESS, type MarketTime } from "@bullhaus/core";
import { Bars } from "@/components/bars";
import { marketSummary } from "@/lib/market";

const d = (n: number | null) => (n === null ? "Sin datos" : `${n.toLocaleString("es-CL")} días`);

function Block({ title, m }: { title: string; m: MarketTime }) {
  return (
    <div className="rounded-xl bg-paper p-4">
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{d(m.avgDays)}</p>
      <p className="mt-1 text-xs text-muted">
        promedio desde que sale al mercado hasta la reserva
        {m.medianDays !== null && ` · mediana ${m.medianDays}`}
      </p>
      <p className="mt-2 text-sm">
        Reserva a cierre: <span className="font-medium tabular-nums">{d(m.avgCloseDays)}</span>
      </p>
      <p className="mt-0.5 text-xs text-muted">{m.count.toLocaleString("es-CL")} operaciones</p>
    </div>
  );
}

/** Indicador de cuánto nos demoramos en vender o arrendar. `compact` para la portada. */
export async function MarketTimeCard({ tenantId, compact = false }: { tenantId: string; compact?: boolean }) {
  const s = await marketSummary(tenantId);
  if (compact) {
    return (
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Días en vender y arrendar</h2>
          <Link href="/gestion#tiempo-en-mercado" className="text-sm text-brand hover:underline">Ver detalle</Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Block title="Venta" m={s.venta} />
          <Block title="Arriendo" m={s.arriendo} />
        </div>
      </section>
    );
  }
  const last = <T,>(xs: T[]) => xs.slice(-6);
  return (
    <section id="tiempo-en-mercado" className="card space-y-5 p-5">
      <div>
        <h2 className="font-semibold">Cuánto nos demoramos en vender y arrendar</h2>
        <p className="mt-1 text-sm text-muted">Días desde que la propiedad sale al mercado hasta la reserva, y de la reserva al cierre. No cuenta operaciones caídas.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Block title="Venta" m={s.venta} />
        <Block title="Arriendo" m={s.arriendo} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {(["venta", "arriendo"] as const).map((op) => (
          <div key={op}>
            <p className="mb-2 text-sm font-medium">{op === "venta" ? "Venta" : "Arriendo"}: días al mercado por trimestre</p>
            {s.trend[op].length ? (
              <Bars rows={last(s.trend[op]).map((q, i, a) => ({ label: q.label, value: q.avgDays, hint: `${q.count} op.`, accent: i === a.length - 1 }))} format={(n) => `${n} días`} />
            ) : (
              <p className="text-sm text-muted">Aún no hay operaciones con fecha de salida al mercado.</p>
            )}
          </div>
        ))}
      </div>
      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium">Qué hacemos para lograrlo y con qué tecnología</summary>
        <ol className="mt-4 grid gap-4 md:grid-cols-2">
          {SALES_PROCESS.map((p) => (
            <li key={p.title}>
              <p className="font-medium">{p.title}</p>
              <ul className="mt-1 space-y-0.5 text-sm text-muted">
                {p.tasks.map((t) => <li key={t}>• {t}</li>)}
              </ul>
              <p className="mt-1.5 text-xs"><span className="chip">Tecnología</span> {p.tech}</p>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
