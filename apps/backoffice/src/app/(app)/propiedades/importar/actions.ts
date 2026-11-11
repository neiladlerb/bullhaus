"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { seesOnlyOwnProperties, validateSheetRows, type RowError } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { PropertyError, saveProperty } from "@/lib/properties";
import { readSpreadsheet } from "@/lib/spreadsheet";

export async function importAction(_prev: { message: string }, form: FormData): Promise<{ message: string }> {
  const user = await requireUser("properties.import");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "Elige un archivo .xlsx o .csv." };
  if (file.size > 10 * 1024 * 1024) return { message: "El archivo supera los 10 MB." };

  let rows;
  try {
    rows = await readSpreadsheet(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return { message: e instanceof Error ? e.message : "No se pudo leer el archivo." };
  }
  if (rows.length === 0) return { message: "La planilla no tiene filas." };

  const brokers = await prisma.user.findMany({
    where: { tenantId: user.tenantId, active: true, ...(seesOnlyOwnProperties(user.role) ? { id: user.id } : {}) },
    select: { email: true },
  });
  const { valid, errors } = validateSheetRows(rows, { knownBrokerEmails: new Set(brokers.map((b) => b.email.toLowerCase())) });

  const allErrors: RowError[] = [...errors];
  let created = 0;
  let updated = 0;
  for (const { row, data } of valid) {
    try {
      const r = await saveProperty(user, data, { source: "planilla" });
      if (r.created) created++;
      else updated++;
    } catch (e) {
      if (!(e instanceof PropertyError)) throw e;
      allErrors.push({ row, code: data.code, messages: [e.message] });
    }
  }
  allErrors.sort((a, b) => a.row - b.row);

  const batch = await prisma.importBatch.create({
    data: { tenantId: user.tenantId, userId: user.id, fileName: file.name, created, updated, rejected: allErrors.length, errors: allErrors as unknown as object },
  });
  await audit(user, "property.import", "import_batch", batch.id, { created, updated, rejected: allErrors.length });
  revalidatePath("/propiedades");
  redirect(`/propiedades/importar?lote=${batch.id}`);
}
