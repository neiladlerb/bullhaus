import { INTEGRATIONS, integrationMode } from "@bullhaus/core";
import { Chip } from "@/components/demo";
import { requireUser } from "@/lib/auth";
import { hasDemoData } from "@/lib/demo";

const MODE = {
  conectada: { tone: "green", label: "Conectada" },
  simulada: { tone: "violet", label: "Simulada (demo)" },
  no_conectada: { tone: "gray", label: "No conectada" },
} as const;

export default async function IntegracionesPage() {
  const user = await requireUser("integrations.read");
  const demo = await hasDemoData(user.tenantId);
  const rows = INTEGRATIONS.map((i) => ({ ...i, mode: integrationMode(i, process.env, demo) }));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integraciones</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Qué está simulado hoy y qué falta para pasar a producción. Regla del sistema: los registros de demostración solo usan integraciones simuladas y los registros reales solo usan integraciones conectadas; si una integración no está conectada, la acción real queda bloqueada en vez de inventar un resultado.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((i) => (
          <section key={i.key} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{i.name}</h2>
                <p className="text-xs text-muted">{i.module}</p>
              </div>
              <Chip tone={MODE[i.mode].tone}>{MODE[i.mode].label}</Chip>
            </div>
            {i.mode === "simulada" && <p className="mt-3 text-sm"><span className="text-muted">En la demo:</span> {i.simulates}</p>}
            <p className="mt-3 text-xs font-semibold text-muted">Para producción</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
              {i.needs.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted">Variables: {i.env.join(", ")}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
