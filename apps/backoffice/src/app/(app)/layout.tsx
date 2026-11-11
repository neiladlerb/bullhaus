import Link from "next/link";
import { can, ROLE_LABELS } from "@bullhaus/core";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "../login/actions";

interface NavItem {
  href: string;
  label: string;
  soon?: boolean;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const nav: NavItem[] = [
    { href: "/", label: "Inicio" },
    { href: "/propiedades", label: "Propiedades" },
    ...(can(user.role, "properties.import") ? [{ href: "/propiedades/importar", label: "Importar planilla" }] : []),
    { href: "#", label: "Pipeline", soon: true },
    { href: "#", label: "Agentes IA", soon: true },
    { href: "#", label: "Contenido y redes", soon: true },
    { href: "#", label: "KYC", soon: true },
    { href: "#", label: "Contratos", soon: true },
    { href: "#", label: "Facturación", soon: true },
    { href: "#", label: "Control de gestión", soon: true },
    ...(can(user.role, "users.manage") ? [{ href: "/usuarios", label: "Usuarios" }] : []),
    ...(can(user.role, "audit.read") ? [{ href: "/auditoria", label: "Auditoría" }] : []),
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
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}
