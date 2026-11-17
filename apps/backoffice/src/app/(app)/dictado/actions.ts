"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  canEditProperty,
  DETAIL_LABELS,
  DICTATION_FIELDS,
  DICTATION_KEYS,
  numbersNotInFicha,
  TYPE_LABELS,
  type DictationFieldKey,
  type FichaForText,
  type FieldValue,
} from "@bullhaus/core";
import { prisma, Prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { describeFicha, extractFields } from "@/lib/dictation";
import { getProperty } from "@/lib/properties";

const back = (id: string, params: Record<string, string>) => redirect(`/dictado/${id}?${new URLSearchParams(params)}`);

async function editableProperty(user: CurrentUser, propertyId: string) {
  const property = await getProperty(user, propertyId);
  if (!property || !canEditProperty(user, property)) redirect("/dictado?error=sin-permiso");
  return property;
}

async function ownDictation(user: CurrentUser, id: string) {
  const d = await prisma.propertyDictation.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!d) redirect("/dictado");
  const property = await editableProperty(user, d.propertyId);
  return { d, property };
}

const createSchema = z.object({
  propertyId: z.string().min(1, "Elige la propiedad"),
  transcript: z.string().trim().min(20, "El dictado es muy corto: cuenta cómo es la propiedad").max(20000, "El dictado es muy largo"),
});

/** Guarda el dictado tal cual y propone los campos. Nada llega a la ficha todavía. */
export async function createDictationAction(form: FormData) {
  const user = await requireUser("properties.write");
  const parsed = createSchema.safeParse({ propertyId: form.get("propertyId"), transcript: form.get("transcript") });
  if (!parsed.success) redirect(`/dictado?${new URLSearchParams({ error: parsed.error.issues[0]?.message ?? "Revisa el dictado", propiedad: String(form.get("propertyId") ?? "") })}`);
  const property = await editableProperty(user, parsed.data.propertyId);
  const { fields, engine, dropped } = await extractFields(parsed.data.transcript);
  const d = await prisma.propertyDictation.create({
    data: {
      tenantId: user.tenantId,
      propertyId: property.id,
      authorId: user.id,
      transcript: parsed.data.transcript,
      extracted: { fields, dropped } as unknown as Prisma.InputJsonValue,
      engine,
    },
  });
  // El texto del dictado no va al registro de auditoría: solo cuántos campos se propusieron.
  await audit(user, "dictation.create", "property", property.id, { dictationId: d.id, engine, proposed: fields.length, dropped });
  redirect(`/dictado/${d.id}`);
}

/** Lee el valor que el corredor dejó en el formulario, según el tipo de campo. null si no es válido. */
function readValue(key: DictationFieldKey, raw: string): FieldValue | null {
  const v = raw.trim();
  const kind = DICTATION_FIELDS[key].kind;
  if (kind === "int" || kind === "number") {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (!v || !Number.isFinite(n) || n < 0) return null;
    return kind === "int" ? Math.round(n) : n;
  }
  if (kind === "bool") return v === "si" ? true : v === "no" ? false : null;
  if (kind === "pets") return v === "si" || v === "no" || v === "consultar" ? v : null;
  if (kind === "list") {
    const list = v.split(",").map((x) => x.trim()).filter(Boolean);
    return list.length ? list : null;
  }
  return v ? v.slice(0, 80) : null;
}

/** Aplica a la ficha solo los campos que el corredor marcó, con el valor que dejó en pantalla. */
export async function applyFieldsAction(form: FormData) {
  const user = await requireUser("properties.write");
  const id = String(form.get("dictationId") ?? "");
  const { d, property } = await ownDictation(user, id);
  const keys = form.getAll("apply").map(String).filter((k): k is DictationFieldKey => (DICTATION_KEYS as string[]).includes(k));
  if (!keys.length) back(id, { error: "Marca al menos un campo para pasarlo a la ficha" });

  const data: Prisma.PropertyUpdateInput = {};
  const details: Record<string, string> = { ...asDetails(property.details) };
  const applied: string[] = [];
  for (const key of keys) {
    const value = readValue(key, String(form.get(`v_${key}`) ?? ""));
    if (value === null) back(id, { error: `${DICTATION_FIELDS[key].label}: el valor no es válido` });
    applied.push(key);
    switch (key) {
      case "m2Useful":
      case "m2Land":
        data[key] = new Prisma.Decimal(value as number);
        break;
      case "bedrooms":
      case "bathrooms":
      case "parking":
      case "storage":
      case "commonExpensesClp":
        data[key] = value as number;
        break;
      case "furnished":
        data.furnished = value as boolean;
        break;
      case "pets":
        data.pets = value as "si" | "no" | "consultar";
        break;
      case "features":
        data.features = [...new Set([...property.features, ...(value as string[])])];
        break;
      default:
        details[DETAIL_LABELS[key] ?? key] = String(value);
    }
  }
  if (Object.keys(details).length) data.details = details;

  await prisma.$transaction([
    prisma.property.update({ where: { id: property.id }, data }),
    prisma.propertyDictation.update({ where: { id: d.id }, data: { status: "aplicado" } }),
  ]);
  await audit(user, "dictation.apply", "property", property.id, { dictationId: d.id, fields: applied });
  revalidatePath(`/propiedades/${property.id}`);
  back(id, { ok: `Ficha actualizada: ${applied.length} ${applied.length === 1 ? "campo" : "campos"}` });
}

function asDetails(json: Prisma.JsonValue | null): Record<string, string> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  return Object.fromEntries(Object.entries(json).filter((e): e is [string, string] => typeof e[1] === "string"));
}

type PropertyForText = NonNullable<Awaited<ReturnType<typeof getProperty>>>;

function fichaForText(p: PropertyForText): FichaForText {
  return {
    type: p.type,
    operation: p.operation,
    comuna: p.comuna,
    sector: p.sector,
    m2Useful: p.m2Useful ? Number(p.m2Useful) : null,
    m2Land: p.m2Land ? Number(p.m2Land) : null,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parking: p.parking,
    storage: p.storage,
    furnished: p.furnished,
    pets: p.pets,
    features: p.features,
    details: asDetails(p.details),
  };
}

/** Redacta la descripción desde la ficha ya revisada. Queda como borrador hasta que el corredor la apruebe. */
export async function generateDescriptionAction(form: FormData) {
  const user = await requireUser("properties.write");
  const id = String(form.get("dictationId") ?? "");
  const { d, property } = await ownDictation(user, id);
  const ficha = fichaForText(property);
  const { text, engine, rejected } = await describeFicha(ficha, TYPE_LABELS[property.type]);
  await prisma.propertyDictation.update({ where: { id: d.id }, data: { descriptionDraft: text } });
  await audit(user, "dictation.describe", "property", property.id, { dictationId: d.id, engine, rejected: rejected.length });
  back(id, rejected.length ? { aviso: `El modelo puso cifras que no están en la ficha (${rejected.join(", ")}); se usó la plantilla` } : { ok: "Borrador de descripción listo" });
}

/** Guarda la descripción en la ficha. No se aprueba si trae cifras que la ficha no tiene. */
export async function approveDescriptionAction(form: FormData) {
  const user = await requireUser("properties.write");
  const id = String(form.get("dictationId") ?? "");
  const { d, property } = await ownDictation(user, id);
  const text = String(form.get("description") ?? "").trim();
  if (text.length < 40) back(id, { error: "La descripción es muy corta" });
  if (text.length > 4000) back(id, { error: "La descripción es muy larga (máximo 4.000 caracteres)" });
  const extra = numbersNotInFicha(text, fichaForText(property));
  if (extra.length) {
    await prisma.propertyDictation.update({ where: { id: d.id }, data: { descriptionDraft: text } });
    back(id, { error: `La descripción tiene cifras que no están en la ficha: ${extra.join(", ")}. Quítalas o agrégalas a la ficha primero` });
  }
  await prisma.$transaction([
    prisma.property.update({ where: { id: property.id }, data: { description: text } }),
    prisma.propertyDictation.update({ where: { id: d.id }, data: { descriptionDraft: text } }),
  ]);
  await audit(user, "dictation.approve_description", "property", property.id, { dictationId: d.id });
  revalidatePath(`/propiedades/${property.id}`);
  back(id, { ok: "Descripción guardada en la ficha" });
}


