"use server";
import { revalidatePath } from "next/cache";
import { SITE_CODES } from "@bullhaus/core";
import { requireUser } from "@/lib/auth";
import { createInstagramDrafts } from "@/lib/campaign-drafts";
import { clearDemoData, loadDemoData } from "@/lib/demo";
import { importSiteListing, type ImportResult } from "@/lib/site-import";

export async function importCodeAction(code: string): Promise<ImportResult> {
  const user = await requireUser("site.import");
  if (!SITE_CODES.includes(code) && !/^\d{6}$/.test(code)) {
    return { code, ok: false, message: "Código no válido", created: 0, updated: 0, photos: 0 };
  }
  const res = await importSiteListing(user, code);
  revalidatePath("/propiedades");
  return res;
}

export async function createDraftsAction(): Promise<string> {
  const user = await requireUser("campaigns.write");
  const n = await createInstagramDrafts(user);
  revalidatePath("/campanas");
  return n === 0 ? "No se crearon campañas nuevas: ya hay borradores en revisión o faltan propiedades disponibles con fotos." : `${n} campaña${n === 1 ? "" : "s"} creada${n === 1 ? "" : "s"} en revisión.`;
}

export async function loadDemoAction(): Promise<string> {
  const user = await requireUser("demo.manage");
  const s = await loadDemoData(user);
  revalidatePath("/", "layout");
  return `Demostración cargada: ${s.leads} leads, ${s.campaigns} campañas, ${s.contracts} contratos, ${s.deals} operaciones, ${s.invoices} facturas, ${s.conversations} conversaciones, ${s.posts} publicaciones, ${s.brochures} brochures y ${s.tasks} compromisos de contacto.`;
}

export async function clearDemoAction(): Promise<string> {
  const user = await requireUser("demo.manage");
  await clearDemoData(user);
  revalidatePath("/", "layout");
  return "Datos de demostración borrados.";
}
