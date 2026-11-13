import Link from "next/link";
import { can, ROLE_LABELS } from "@bullhaus/core";
import { Logo } from "@/components/logo";
import { UfCalculator } from "@/components/uf-calculator";
import { requireUser } from "@/lib/auth";
import { hasDemoData } from "@/lib/demo";
import { getUf } from "@/lib/uf";
import { logoutAction } from "../login/actions";

interface NavItem {
  href: string;
  label: string;
  soon?: boolean;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, uf] = await Promise.all([requireUser(undefined, { allowPendingPasswordChange: true }), getUf()]);
  const demo = await hasDemoData(user.tenantId);

  const nav: NavItem[] = [
    { href: "/", label: "Inicio" },
    { href: "/propiedades", label: "Propiedades" },
    ...(can(user.role, "properties.import") ? [{ href: "/propiedades/importar", label: "Importar planilla" }] : []),
    ...(can(user.role, "leads.read")
      ? [
          { href: "/leads", label: "Leads y RRSS" },
          { href: "/pipeline", label: "Pipeline" },
          { href: "/brochures", label: "Brochures" },
        ]
      : []),
    ...(can(user.role, "deals.read") ? [{ href: "/operaciones", label: "Operaciones" }] : []),
    ...(can(user.role, "campaigns.read")
      ? [
          { href: "/campanas", label: "Campañas Instagram" },
          { href: "/redes", label: "Redes sociales" },
        ]
      : []),
    ...(can(user.role, "agents.read") ? [{ href: "/agentes", label: "Agentes IA" }] : []),
    ...(can(user.role, "kyc.read") ? [{ href: "/kyc", label: "KYC" }] : []),
    ...(can(user.role, "contracts.read") ? [{ href: "/contratos", label: "Contratos" }] : []),
    ...(can(user.role, "billing.read") ? [{ href: "/facturacion", label: "Facturación" }] : []),
    ...(can(user.role, "analytics.read") ? [{ href: "/gestion", label: "Control de gestión" }] : []),
    ...(can(user.role, "integrations.read") ? [{ href: "/integraciones", label: "Integraciones" }] : []),
    ...(can(user.role, "brand.manage") ? [{ href: "/marca", label: "Marca y sitio web" }] : []),
    ...(can(user.role, "users.manage") ? [{ href: "/usuarios", label: "Usuarios" }] : []),
    ...(can(user.role, "audit.read") ? [{ href: "/auditoria", label: "Auditoría" }] : []),
    ...(can(user.role, "site.import") ? [{ href: "/datos", label: "Carga de datos" }] : []),
    { href: "/cuenta", label: "Mi cuenta" },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-ink text-white md:w-60">
        <div className="flex items-center justify-between px-5 py-5 md:block">
          <Logo light />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {nav.map((item) =>
            item.soon ? (
              <span key={item.label} className="flex shrink-0 items-center justify-between rounded-md px-3 py-2 text-sm text-white/35" title="Próximo paso del plan">
                {item.label}
                <span className="ml-2 hidden text-[10px] uppercase tracking-wider md:inline">Pronto</span>
              </span>
            ) : (
              <Link key={item.href} href={item.href} className="shrink-0 rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10 hover:text-white">
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 text-sm md:block">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-white/60">{ROLE_LABELS[user.role]}</p>
          <form action={logoutAction} className="mt-3">
            <button className="text-xs text-white/70 underline-offset-2 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        {demo && (
          <p className="mb-5 flex flex-wrap items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm text-white print:hidden">
            <strong>Modo demostración.</strong> Hay datos ficticios cargados y las integraciones externas están simuladas.
            {can(user.role, "demo.manage") && (
              <Link href="/datos" className="underline">
                Administrar
              </Link>
            )}
          </p>
        )}
        {children}
      </main>
      <UfCalculator uf={uf} />
    </div>
  );
}
