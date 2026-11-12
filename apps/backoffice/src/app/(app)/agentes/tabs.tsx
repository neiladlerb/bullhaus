import Link from "next/link";

export function AgentTabs({ active }: { active: "resumen" | "bandeja" | "redes" | "ajustes" }) {
  const tabs = [
    { key: "resumen", href: "/agentes", label: "Resumen" },
    { key: "bandeja", href: "/agentes/bandeja", label: "Bandeja de conversaciones" },
    { key: "redes", href: "/agentes/redes", label: "Agente de redes sociales" },
    { key: "ajustes", href: "/agentes/ajustes", label: "Ajustes y base de conocimiento" },
  ] as const;
  return (
    <nav className="flex flex-wrap gap-1 border-b border-line text-sm">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={`-mb-px border-b-2 px-3 py-2 ${active === t.key ? "border-brand font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
