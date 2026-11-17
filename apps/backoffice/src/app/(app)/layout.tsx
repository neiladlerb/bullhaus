import Link from "next/link";
import { can, ROLE_LABELS } from "@bullhaus/core";
import { Logo } from "@/components/logo";
import { BackofficeNav, type NavGroup } from "@/components/nav";
import { UfCalculator } from "@bullhaus/ui/uf-calculator";
import { requireUser } from "@/lib/auth";
import { hasDemoData } from "@/lib/demo";
import { getUf } from "@/lib/uf";
import { logoutAction } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, uf] = await Promise.all([requireUser(undefined, { allowPendingPasswordChange: true }), getUf()]);
  const demo = await hasDemoData(user.tenantId);

  // Grupos por área de trabajo (skill diseno-bullhaus, backoffice.md). Un grupo aparece solo si el rol
  // tiene al menos un enlace dentro.
  const groups: NavGroup[] = [
    { title: null, links: [{ href: "/", label: "Inicio" }] },
    {
      title: "Cartera",
      links: [
        { href: "/propiedades", label: "Propiedades" },
        ...(can(user.role, "properties.import") ? [{ href: "/propiedades/importar", label: "Importar planilla" }] : []),
        { href: "/propiedades/precios", label: "Revisión de precios" },
      ],
    },
    {
      title: "Clientes",
      links: can(user.role, "leads.read")
        ? [
            { href: "/leads", label: "Leads y redes" },
            { href: "/pipeline", label: "Pipeline" },
            { href: "/brochures", label: "Brochures" },
          ]
        : [],
    },
    {
      title: "Operaciones",
      links: [
        ...(can(user.role, "deals.read") ? [{ href: "/operaciones", label: "Operaciones" }] : []),
        ...(can(user.role, "kyc.read") ? [{ href: "/kyc", label: "KYC" }] : []),
        ...(can(user.role, "contracts.read") ? [{ href: "/contratos", label: "Contratos" }] : []),
        ...(can(user.role, "billing.read") ? [{ href: "/facturacion", label: "Facturación" }] : []),
      ],
    },
    {
      title: "Marketing",
      links: [
        ...(can(user.role, "campaigns.read")
          ? [
              { href: "/campanas", label: "Campañas Instagram" },
              { href: "/redes", label: "Redes sociales" },
            ]
          : []),
        ...(can(user.role, "agents.read") ? [{ href: "/agentes", label: "Agentes IA" }] : []),
      ],
    },
    { title: "Análisis", links: can(user.role, "analytics.read") ? [{ href: "/gestion", label: "Control de gestión" }] : [] },
    {
      title: "Administración",
      links: [
        ...(can(user.role, "users.manage") ? [{ href: "/usuarios", label: "Usuarios" }] : []),
        ...(can(user.role, "brand.manage") ? [{ href: "/marca", label: "Marca y sitio web" }] : []),
        ...(can(user.role, "integrations.read") ? [{ href: "/integraciones", label: "Integraciones" }] : []),
        ...(can(user.role, "site.import") ? [{ href: "/datos", label: "Carga de datos" }] : []),
        ...(can(user.role, "audit.read") ? [{ href: "/auditoria", label: "Auditoría" }] : []),
      ],
    },
    { title: "Tu cuenta", links: [{ href: "/cuenta", label: "Mi cuenta" }] },
  ].filter((g) => g.links.length > 0);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-ink text-white md:sticky md:top-0 md:h-screen md:w-64">
        <div className="flex items-center justify-between gap-3 px-5 py-5 md:flex-col md:items-start">
          <Logo light />
          {/* La calculadora vive en el menú: como pestaña fija tapaba contenido en el celular (revisión UX, B5). */}
          <UfCalculator
            uf={uf}
            shortcut
            label={uf ? `UF ${Math.round(uf.value).toLocaleString("es-CL")}` : "Calculadora UF"}
            className="min-h-11 rounded-md border border-white/30 px-3 text-xs font-semibold text-white hover:bg-white/10 md:min-h-9"
          />
        </div>
        <BackofficeNav groups={groups} />
        <div className="hidden border-t border-white/10 px-5 py-4 text-sm md:block">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-white/70">{ROLE_LABELS[user.role]}</p>
          <form action={logoutAction} className="mt-3">
            <button className="min-h-11 text-sm text-white/85 underline-offset-2 hover:underline md:min-h-8">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        {demo && (
          <p className="mb-5 flex flex-wrap items-center gap-2 rounded-md border border-info/30 bg-info-soft px-4 py-2 text-sm text-info print:hidden">
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
    </div>
  );
}
