"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canEditProperty, cleanRut, formatRut, isValidRut, parseChileanDate, parseChileanNumber, propertyInputSchema } from "@bullhaus/core";
import { prisma, Prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { PropertyError, getProperty, saveProperty } from "@/lib/properties";
import { putFile, removePrefix, savePhoto } from "@/lib/storage";

export interface FormState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  /** Lo que envió el usuario, para no perderlo si hay errores (React reinicia el formulario). */
  values?: Record<string, string>;
}

const FIELDS = [
  "code", "operation", "type", "comuna", "sector", "price", "currency", "commonExpensesClp", "m2Useful", "m2Land",
  "bedrooms", "bathrooms", "parking", "storage", "pets", "furnished", "availableFrom", "status", "brokerEmail",
  "addressPrivate", "instagramUrl", "adIds", "description", "publishWeb",
] as const;

/** Campos de texto de un formulario (sin archivos). */
function textValues(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

function submitted(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = form.get(f);
    if (typeof v === "string") out[f] = v;
  }
  return out;
}

export async function savePropertyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("properties.write");
  const raw: Record<string, unknown> = {};
  for (const f of FIELDS) raw[f] = form.get(f) ?? undefined;
  const id = (form.get("id") as string | null) || undefined;

  const parsed = propertyInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const iss of parsed.error.issues) {
      const k = String(iss.path[0] ?? "form");
      (fieldErrors[k] ??= []).push(iss.message);
    }
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors, values: submitted(form) };
  }

  let result: { id: string; created: boolean };
  try {
    result = await saveProperty(user, parsed.data, { id, source: "panel" });
  } catch (e) {
    if (e instanceof PropertyError) return { ok: false, message: e.message, values: submitted(form) };
    throw e;
  }
  revalidatePath("/propiedades");
  if (result.created) redirect(`/propiedades/${result.id}?creada=1`);
  revalidatePath(`/propiedades/${result.id}`);
  return { ok: true, message: "Cambios guardados." };
}

async function editableProperty(id: string) {
  const user = await requireUser("properties.write");
  const property = await getProperty(user, id);
  if (!property || !canEditProperty(user, property)) throw new Error("No tienes permiso para editar esta propiedad");
  return { user, property };
}

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export async function uploadPhotosAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { user, property } = await editableProperty(String(form.get("propertyId")));
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, message: "Elige al menos una foto." };

  const rejected: string[] = [];
  let order = property.media.length;
  let hasCover = property.media.some((m) => m.isCover);
  let saved = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES) {
      rejected.push(file.name);
      continue;
    }
    try {
      const { folder, sizes } = await savePhoto(property.id, Buffer.from(await file.arrayBuffer()));
      await prisma.propertyMedia.create({
        data: { propertyId: property.id, storageKey: folder, sizes, order: order++, isCover: !hasCover, source: "panel" },
      });
      hasCover = true;
      saved++;
    } catch {
      rejected.push(file.name);
    }
  }
  await audit(user, "property.photos.upload", "property", property.id, { saved, rejected: rejected.length });
  revalidatePath(`/propiedades/${property.id}`);
  const msg = `${saved} foto${saved === 1 ? "" : "s"} subida${saved === 1 ? "" : "s"}.`;
  return rejected.length
    ? { ok: saved > 0, message: `${msg} No se pudieron subir: ${rejected.join(", ")} (solo imágenes de hasta 15 MB).` }
    : { ok: true, message: msg };
}

export async function setCoverAction(form: FormData): Promise<void> {
  const { user, property } = await editableProperty(String(form.get("propertyId")));
  const mediaId = String(form.get("mediaId"));
  if (!property.media.some((m) => m.id === mediaId)) return;
  await prisma.$transaction([
    prisma.propertyMedia.updateMany({ where: { propertyId: property.id }, data: { isCover: false } }),
    prisma.propertyMedia.update({ where: { id: mediaId }, data: { isCover: true } }),
  ]);
  await audit(user, "property.photos.cover", "property", property.id, { mediaId });
  revalidatePath(`/propiedades/${property.id}`);
}

export async function movePhotoAction(form: FormData): Promise<void> {
  const { property } = await editableProperty(String(form.get("propertyId")));
  const mediaId = String(form.get("mediaId"));
  const dir = form.get("dir") === "up" ? -1 : 1;
  const list = [...property.media].sort((a, b) => a.order - b.order);
  const i = list.findIndex((m) => m.id === mediaId);
  const j = i + dir;
  const a = list[i];
  const b = list[j];
  if (!a || !b) return;
  await prisma.$transaction([
    prisma.propertyMedia.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.propertyMedia.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath(`/propiedades/${property.id}`);
}

export async function deletePhotoAction(form: FormData): Promise<void> {
  const { user, property } = await editableProperty(String(form.get("propertyId")));
  const media = property.media.find((m) => m.id === String(form.get("mediaId")));
  if (!media) return;
  await prisma.propertyMedia.delete({ where: { id: media.id } });
  await removePrefix("public", media.storageKey);
  if (media.isCover) {
    const next = await prisma.propertyMedia.findFirst({ where: { propertyId: property.id }, orderBy: { order: "asc" } });
    if (next) await prisma.propertyMedia.update({ where: { id: next.id }, data: { isCover: true } });
  }
  await audit(user, "property.photos.delete", "property", property.id, { mediaId: media.id });
  revalidatePath(`/propiedades/${property.id}`);
}

const mandateSchema = z.object({
  ownerName: z.string().trim().min(3, "Nombre del propietario: obligatorio"),
  ownerRut: z.string().refine(isValidRut, "RUT del propietario no válido"),
  ownerEmail: z.preprocess((v) => (v === "" ? undefined : v), z.string().email("Email no válido").optional()),
  ownerPhone: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(30).optional()),
  exclusive: z.enum(["si", "no"]),
  commissionPct: z.preprocess((v) => parseChileanNumber(v) ?? Number.NaN, z.number().gt(0, "Comisión: debe ser mayor que 0").max(20, "Comisión: revisa el porcentaje")),
  commissionTerms: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(1000).optional()),
  signedAt: z.preprocess((v) => parseChileanDate(v) ?? undefined, z.date({ required_error: "Fecha de firma: usa dd/mm/aaaa" })),
  expiresAt: z.preprocess((v) => parseChileanDate(v) ?? undefined, z.date({ required_error: "Fecha de vencimiento: usa dd/mm/aaaa" })),
});

export async function addMandateAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("mandates.write");
  const { property } = await editableProperty(String(form.get("propertyId")));
  const values = textValues(form);
  const parsed = mandateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues.map((i) => i.message).join(". "), values };
  const m = parsed.data;
  if (m.expiresAt <= m.signedAt) return { ok: false, message: "El vencimiento debe ser posterior a la firma.", values };
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024)) {
    return { ok: false, message: "El archivo del mandato debe ser un PDF de hasta 20 MB.", values };
  }

  const rut = formatRut(cleanRut(m.ownerRut));
  const owner = await prisma.client.upsert({
    where: { tenantId_rut: { tenantId: user.tenantId, rut } },
    update: { name: m.ownerName, email: m.ownerEmail, phone: m.ownerPhone },
    create: { tenantId: user.tenantId, rut, name: m.ownerName, email: m.ownerEmail, phone: m.ownerPhone },
  });

  const mandate = await prisma.mandate.create({
    data: {
      propertyId: property.id,
      ownerClientId: owner.id,
      exclusive: m.exclusive === "si",
      commissionPct: new Prisma.Decimal(m.commissionPct),
      commissionTerms: m.commissionTerms,
      signedAt: m.signedAt,
      expiresAt: m.expiresAt,
      status: m.expiresAt < new Date() ? "vencido" : "vigente",
    },
  });

  if (hasFile && file instanceof File) {
    const key = `mandates/${mandate.id}.pdf`;
    await putFile("private", key, Buffer.from(await file.arrayBuffer()));
    await prisma.mandate.update({ where: { id: mandate.id }, data: { fileKey: key } });
  }

  await audit(user, "mandate.create", "mandate", mandate.id, { propertyId: property.id, exclusive: mandate.exclusive });
  revalidatePath(`/propiedades/${property.id}`);
  return { ok: true, message: "Mandato registrado." };
}
