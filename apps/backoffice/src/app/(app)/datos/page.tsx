import { SITE_CODES } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { PHOTOS_PER_PROPERTY } from "@/lib/site-import";
import { ActionButton, ImportPanel } from "./panel";

// Cada importación baja fotos y las convierte: damos margen a la función de Vercel.
export const maxDuration = 60;

export default async function DatosPage() {
  const user = await requireUser("site.import");
  const [properties, imported, demoLeads, drafts] = await Promise.all([
    prisma.property.count({ where: { tenantId: user.tenantId } }),
    prisma.property.count({ where: { tenantId: user.tenantId, sourceUrl: { not: null } } }),
    prisma.lead.count({ where: { tenantId: user.tenantId, isDemo: true } }),
    prisma.campaign.count({ where: { tenantId: user.tenantId, isDemo: false, status: "en_revision" } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Carga de datos</h1>
        <p className="mt-1 text-sm text-muted">Importación de la cartera publicada en bullhaus.cl, campañas iniciales y datos de demostración.</p>
      </div>

      <section className="card p-5">
        <h2 className="font-medium">1. Propiedades de bullhaus.cl</h2>
        <p className="mt-1 text-sm text-muted">
          Lee cada ficha publicada y la carga o actualiza aquí, con su corredor y hasta {PHOTOS_PER_PROPERTY} fotos. Se puede repetir sin duplicar.
          Las propiedades en venta y arriendo quedan como dos fichas (la de arriendo con el sufijo -A). La ubicación del mapa no se importa: la dirección exacta es privada.
        </p>
        <p className="mt-2 text-sm">
          Hoy hay <strong>{properties}</strong> propiedades en el back office, {imported} importadas del sitio.
        </p>
        <div className="mt-4">
          <ImportPanel codes={SITE_CODES} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-medium">2. Campañas de Instagram</h2>
        <p className="mt-1 text-sm text-muted">
          Crea borradores de captación de propietarios, venta y arriendo con textos tomados de las fichas. Quedan <strong>en revisión</strong>: nada se publica ni
          gasta presupuesto hasta que un administrador lo apruebe en Campañas.
        </p>
        <p className="mt-2 text-sm">{drafts} campañas en revisión.</p>
        <div className="mt-4">
          <ActionButton action="createDraftsAction" label="Crear campañas de captación, venta y arriendo" variant="btn-primary" />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-medium">3. Datos de demostración</h2>
        <p className="mt-1 text-sm text-muted">
          Arma una demostración completa sobre la cartera real: leads de 90 días, campañas con gasto diario, propietarios con KYC y certificados, una orden de corretaje por
          cada propiedad, operaciones de los últimos 12 meses con cartas oferta, promesas, contratos de arriendo y facturas, conversaciones de los agentes, las cuentas de
          Instagram y Facebook con 120 días de métricas, la página de LinkedIn con la serie “Bull Haus te asesora”, brochures con sus envíos y compromisos de contacto en el pipeline, Google Ads y Google Analytics simulados, y usuarios de Cumplimiento y Finanzas.
        </p>
        <p className="mt-2 text-sm text-muted">
          Todo va marcado como demostración (isDemo), usa solo integraciones simuladas y se borra con un clic sin tocar las propiedades ni los usuarios reales. Ningún agente escribe a estos contactos. Ver docs/demo.md.
        </p>
        <p className="mt-2 text-sm">{demoLeads} leads de demostración cargados.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ActionButton action="loadDemoAction" label={demoLeads ? "Volver a generar" : "Cargar datos de demostración"} variant="btn-primary" />
          {demoLeads > 0 && <ActionButton action="clearDemoAction" label="Borrar datos de demostración" confirm="Se borrarán todos los datos de demostración (leads, campañas, contratos, operaciones, facturas, conversaciones, redes y usuarios demo). Las propiedades y usuarios reales no se tocan. ¿Continuar?" />}
        </div>
      </section>
    </div>
  );
}
