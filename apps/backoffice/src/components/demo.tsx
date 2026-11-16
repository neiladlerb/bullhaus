import Link from "next/link";

/** Marca un registro de demostración. */
export function DemoTag() {
  return <span className="chip ml-1.5 bg-info-soft text-[10px] text-info">demo</span>;
}

/** Aviso al inicio de un módulo que hoy funciona con integraciones simuladas. */
export function SimulatedNote({ what, integration }: { what: string; integration: string }) {
  return (
    <p className="rounded-md border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
      <strong>Demostración.</strong> {what} La integración con {integration} está simulada: nada sale a un servicio real.{" "}
      <Link href="/integraciones" className="underline">
        Qué falta para producción
      </Link>
    </p>
  );
}

export function Chip({ tone, children }: { tone: "green" | "amber" | "red" | "sky" | "gray" | "violet" | "ink"; children: React.ReactNode }) {
  const cls = {
    green: "bg-success-soft text-success",
    amber: "bg-warning-soft text-warning",
    red: "bg-danger-soft text-danger",
    sky: "bg-info-soft text-info",
    gray: "bg-paper text-muted",
    violet: "bg-info-soft text-info",
    ink: "bg-ink text-white",
  }[tone];
  return <span className={`chip ${cls}`}>{children}</span>;
}
