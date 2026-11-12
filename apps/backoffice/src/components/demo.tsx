import Link from "next/link";

/** Marca un registro de demostración. */
export function DemoTag() {
  return <span className="chip ml-1.5 bg-violet-100 text-[10px] text-violet-800">demo</span>;
}

/** Aviso al inicio de un módulo que hoy funciona con integraciones simuladas. */
export function SimulatedNote({ what, integration }: { what: string; integration: string }) {
  return (
    <p className="rounded-md border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
      <strong>Demostración.</strong> {what} La integración con {integration} está simulada: nada sale a un servicio real.{" "}
      <Link href="/integraciones" className="underline">
        Qué falta para producción
      </Link>
    </p>
  );
}

export function Chip({ tone, children }: { tone: "green" | "amber" | "red" | "sky" | "gray" | "violet" | "ink"; children: React.ReactNode }) {
  const cls = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-red-100 text-red-800",
    sky: "bg-sky-100 text-sky-900",
    gray: "bg-paper text-muted",
    violet: "bg-violet-100 text-violet-800",
    ink: "bg-ink text-white",
  }[tone];
  return <span className={`chip ${cls}`}>{children}</span>;
}
