// Carga inicial de producción. Corre en el build de Vercel después de las migraciones, con las variables
// que Vercel ya tiene (nadie maneja contraseñas). Solo actúa si la cartera está vacía:
//   1. importa las fichas publicadas en www.bullhaus.cl, con sus fotos, al back office (y de ahí a la web);
//   2. crea los borradores de campañas de Instagram (quedan en revisión, no se publican);
//   3. carga los datos de demostración (isDemo, se borran desde Carga de datos).
// Si algo falla, lo informa y deja seguir el despliegue: los botones de /datos siguen disponibles.
import { SITE_CODES } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import type { CurrentUser } from "../src/lib/auth";
import { createInstagramDrafts } from "../src/lib/campaign-drafts";
import { hasDemoData, loadDemoData } from "../src/lib/demo";
import { importSiteListing } from "../src/lib/site-import";

const SLUG = process.env.PUBLIC_TENANT_SLUG ?? "bullhaus";
const log = (m: string) => console.log(`[carga inicial] ${m}`);

async function main() {
  if (process.env.BOOTSTRAP_DISABLED === "1") return log("desactivada con BOOTSTRAP_DISABLED");
  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (!tenant) return log(`no existe el tenant ${SLUG}; se omite`);
  const props = await prisma.property.count({ where: { tenantId: tenant.id } });
  if (props > 0 && process.env.BOOTSTRAP_FORCE !== "1") return log(`la cartera ya tiene ${props} propiedades; no se hace nada`);
  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: "admin", active: true, isDemo: false }, orderBy: { createdAt: "asc" } });
  if (!admin) return log("no hay un administrador activo; se omite");
  const user: CurrentUser = { id: admin.id, tenantId: tenant.id, name: admin.name, email: admin.email, role: admin.role, mustChangePassword: false, sessionTokenHash: "" };

  log(`importando ${SITE_CODES.length} fichas de www.bullhaus.cl…`);
  const queue = [...SITE_CODES];
  const totals = { ok: 0, failed: 0, created: 0, photos: 0 };
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let code = queue.shift(); code; code = queue.shift()) {
        try {
          const r = await importSiteListing(user, code);
          if (r.ok) totals.ok++;
          else {
            totals.failed++;
            log(`${code}: ${r.message || "sin detalle"}`);
          }
          totals.created += r.created;
          totals.photos += r.photos;
        } catch (e) {
          totals.failed++;
          log(`${code}: ${e instanceof Error ? e.message : "error"}`);
        }
      }
    }),
  );
  log(`fichas: ${totals.ok} importadas, ${totals.failed} con problemas, ${totals.created} propiedades nuevas, ${totals.photos} fotos`);

  try {
    log(`campañas en revisión creadas: ${await createInstagramDrafts(user)}`);
  } catch (e) {
    log(`campañas: ${e instanceof Error ? e.message : "error"}`);
  }

  if (await hasDemoData(tenant.id)) return log("ya hay datos de demostración");
  try {
    const s = await loadDemoData(user);
    log(`demostración: ${s.leads} leads, ${s.deals} operaciones, ${s.contracts} contratos, ${s.conversations} conversaciones, ${s.posts} publicaciones, ${s.brochures} brochures`);
  } catch (e) {
    log(`demostración: ${e instanceof Error ? e.message : "error"}`);
  }
}

main()
  .catch((e) => log(`error inesperado: ${e instanceof Error ? e.message : String(e)}`))
  .finally(() => prisma.$disconnect());
