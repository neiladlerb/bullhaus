"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ADJUSTMENT_MAX_EACH, ADJUSTMENT_PRESETS, CURRENCIES, OPERATIONS, parseAdjustments, PROPERTY_TYPES, suggestComparables, usesLandArea } from "@bullhaus/core";
import { prisma, Prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { getProperty } from "@/lib/properties";
import { loadCandidates, subjectOf, valuationScope, type Candidate } from "@/lib/valuation";

/** Número opcional desde un formulario: "" queda vacío; acepta "1.250,5". */
const optNum = (max: number, int = false) =>
  z.preprocess((v) => {
    const s = String(v ?? "").trim();
    if (!s) return undefined;
    return Number(s.replace(/\./g, "").replace(",", "."));
  }, (int ? z.number().int("Usa un número entero") : z.number()).positive("Debe ser mayor que cero").max(max).optional());
const optText = (max: number) => z.preprocess((v) => (String(v ?? "").trim() ? String(v).trim() : undefined), z.string().max(max).optional());

const subjectSchema = z.object({
  propertyId: optText(40),
  preparedFor: optText(120),
  operation: z.enum(OPERATIONS),
  type: z.enum(PROPERTY_TYPES),
  comuna: z.string().trim().min(2, "Escribe la comuna").max(60),
  sector: optText(80),
  currency: z.enum(CURRENCIES),
  m2Useful: optNum(100_000),
  m2Land: optNum(10_000_000),
  bedrooms: optNum(50, true),
  bathrooms: optNum(50, true),
  parking: optNum(50, true),
  notes: optText(2000),
});

const back: (id: string, params?: Record<string, string>) => never = (id, params = {}) =>
  redirect(`/tasaciones/${id}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`);

async function ownValuation(user: CurrentUser, id: string) {
  const v = await prisma.valuation.findFirst({ where: { id, ...valuationScope(user) }, include: { comparables: true } });
  if (!v) redirect("/tasaciones");
  return v;
}

const snapshot = (valuationId: string, c: Candidate): Prisma.ValuationComparableCreateManyInput => ({
  valuationId,
  source: c.source,
  propertyId: c.propertyId,
  dealId: c.dealId,
  label: c.label,
  operation: c.operation,
  type: c.type,
  comuna: c.comuna,
  sector: c.sector,
  currency: c.currency,
  price: new Prisma.Decimal(c.price),
  m2Useful: c.m2Useful === null ? null : new Prisma.Decimal(c.m2Useful),
  m2Land: c.m2Land === null ? null : new Prisma.Decimal(c.m2Land),
  bedrooms: c.bedrooms,
  bathrooms: c.bathrooms,
  observedAt: c.observedAt,
});

/** Crea la tasación y deja como comparables los 10 más parecidos de la data de Bull Haus. */
export async function createValuationAction(form: FormData) {
  const user = await requireUser("properties.write");
  const parsed = subjectSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/tasaciones/nueva?${new URLSearchParams({ error: parsed.error.issues[0]?.message ?? "Revisa los datos", propiedad: String(form.get("propertyId") ?? "") })}`);
  const d = parsed.data;
  const area = usesLandArea(d.type) ? d.m2Land : d.m2Useful;
  if (!area) redirect(`/tasaciones/nueva?${new URLSearchParams({ error: usesLandArea(d.type) ? "Falta la superficie del terreno" : "Falta la superficie útil", propiedad: d.propertyId ?? "" })}`);
  // Solo se vincula una propiedad que el usuario puede ver.
  const propertyId = d.propertyId && (await getProperty(user, d.propertyId)) ? d.propertyId : null;

  const v = await prisma.valuation.create({
    data: {
      tenantId: user.tenantId,
      propertyId,
      authorId: user.id,
      preparedFor: d.preparedFor ?? null,
      operation: d.operation,
      type: d.type,
      comuna: d.comuna,
      sector: d.sector ?? null,
      currency: d.currency,
      m2Useful: d.m2Useful === undefined ? null : new Prisma.Decimal(d.m2Useful),
      m2Land: d.m2Land === undefined ? null : new Prisma.Decimal(d.m2Land),
      bedrooms: d.bedrooms ?? null,
      bathrooms: d.bathrooms ?? null,
      parking: d.parking ?? null,
      notes: d.notes ?? null,
    },
  });
  const subject = subjectOf(v);
  const picked = suggestComparables(subject, await loadCandidates(user.tenantId, subject, propertyId));
  if (picked.length) await prisma.valuationComparable.createMany({ data: picked.map((c) => snapshot(v.id, c)) });
  await audit(user, "valuation.create", "valuation", v.id, { propertyId, comparables: picked.length });
  redirect(`/tasaciones/${v.id}`);
}

/** Vuelve a buscar en la data de Bull Haus y agrega los que no estaban (sin tocar los que el corredor ya revisó). */
export async function refreshComparablesAction(form: FormData) {
  const user = await requireUser("properties.write");
  const v = await ownValuation(user, String(form.get("valuationId") ?? ""));
  const subject = subjectOf(v);
  const have = new Set(v.comparables.map((c) => c.dealId ?? c.propertyId).filter(Boolean));
  const fresh = suggestComparables(subject, await loadCandidates(user.tenantId, subject, v.propertyId), 15).filter((c) => !have.has(c.dealId ?? c.propertyId));
  if (fresh.length) await prisma.valuationComparable.createMany({ data: fresh.map((c) => snapshot(v.id, c)) });
  back(v.id, { ok: fresh.length ? `Se agregaron ${fresh.length} comparables` : "No hay comparables nuevos en la data de Bull Haus" });
}

export async function toggleComparableAction(form: FormData) {
  const user = await requireUser("properties.write");
  const v = await ownValuation(user, String(form.get("valuationId") ?? ""));
  const c = v.comparables.find((x) => x.id === form.get("comparableId"));
  if (c) await prisma.valuationComparable.update({ where: { id: c.id }, data: { included: !c.included } });
  revalidatePath(`/tasaciones/${v.id}`);
  back(v.id);
}

export async function removeComparableAction(form: FormData) {
  const user = await requireUser("properties.write");
  const v = await ownValuation(user, String(form.get("valuationId") ?? ""));
  const c = v.comparables.find((x) => x.id === form.get("comparableId"));
  if (c && c.source === "manual") await prisma.valuationComparable.delete({ where: { id: c.id } });
  back(v.id);
}

const manualSchema = z.object({
  label: z.string().trim().min(3, "Escribe un título para el aviso").max(120),
  url: z.preprocess((v) => (String(v ?? "").trim() ? String(v).trim() : undefined), z.string().url("El enlace no es válido").startsWith("https://", "El enlace debe empezar con https://").max(500).optional()),
  sector: optText(80),
  price: optNum(1_000_000_000_000),
  m2Useful: optNum(100_000),
  m2Land: optNum(10_000_000),
  bedrooms: optNum(50, true),
  bathrooms: optNum(50, true),
  observedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica cuándo viste el aviso"),
});

/**
 * Aviso que el corredor vio en un portal y copia a mano, con su enlace. No se descargan datos de portales en forma
 * automática (sus condiciones de uso lo prohíben). Tiene la operación, tipo, comuna y moneda de la tasación.
 */
export async function addManualComparableAction(form: FormData) {
  const user = await requireUser("properties.write");
  const v = await ownValuation(user, String(form.get("valuationId") ?? ""));
  const parsed = manualSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) back(v.id, { error: parsed.error.issues[0]?.message ?? "Revisa el aviso" });
  const d = parsed.data;
  if (!d.price) back(v.id, { error: "Falta el precio del aviso" });
  const area = usesLandArea(v.type) ? d.m2Land : d.m2Useful;
  if (!area) back(v.id, { error: usesLandArea(v.type) ? "Falta la superficie del terreno del aviso" : "Falta la superficie útil del aviso" });
  await prisma.valuationComparable.create({
    data: {
      valuationId: v.id,
      source: "manual",
      label: d.label,
      url: d.url ?? null,
      operation: v.operation,
      type: v.type,
      comuna: v.comuna,
      sector: d.sector ?? null,
      currency: v.currency,
      price: new Prisma.Decimal(d.price),
      m2Useful: d.m2Useful === undefined ? null : new Prisma.Decimal(d.m2Useful),
      m2Land: d.m2Land === undefined ? null : new Prisma.Decimal(d.m2Land),
      bedrooms: d.bedrooms ?? null,
      bathrooms: d.bathrooms ?? null,
      observedAt: new Date(`${d.observedAt}T12:00:00`),
    },
  });
  back(v.id, { ok: "Aviso agregado como comparable" });
}

export async function saveNotesAction(form: FormData) {
  const user = await requireUser("properties.write");
  const v = await ownValuation(user, String(form.get("valuationId") ?? ""));
  const parsed = z.object({ preparedFor: optText(120), notes: optText(2000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) back(v.id, { error: parsed.error.issues[0]?.message ?? "Revisa el texto" });
  await prisma.valuation.update({ where: { id: v.id }, data: { preparedFor: parsed.data.preparedFor ?? null, notes: parsed.data.notes ?? null } });
  back(v.id, { ok: "Guardado" });
}

export async function markDeliveredAction(form: FormData) {
  const user = await requireUser("properties.write");
  const v = await ownValuation(user, String(form.get("valuationId") ?? ""));
  await prisma.valuation.update({ where: { id: v.id }, data: { status: v.status === "entregada" ? "borrador" : "entregada" } });
  await audit(user, v.status === "entregada" ? "valuation.reopen" : "valuation.deliver", "valuation", v.id);
  back(v.id);
}

const adjustmentSchema = z.object({
  label: z.enum(ADJUSTMENT_PRESETS),
  other: optText(60),
  percent: z.preprocess((v) => Number(String(v ?? "").replace(",", ".")), z.number().min(-ADJUSTMENT_MAX_EACH, `Máximo ${ADJUSTMENT_MAX_EACH} % por ajuste`).max(ADJUSTMENT_MAX_EACH, `Máximo ${ADJUSTMENT_MAX_EACH} % por ajuste`).refine((n) => n !== 0, "El porcentaje no puede ser 0")),
  note: z.string().trim().min(5, "Explica el ajuste: va en el informe").max(300),
});

/** Ajuste del corredor por algo que los comparables no ven. Queda escrito en el informe con su motivo. */
export async function addAdjustmentAction(form: FormData) {
  const user = await requireUser("properties.write");
  const v = await ownValuation(user, String(form.get("valuationId") ?? ""));
  const parsed = adjustmentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) back(v.id, { error: parsed.error.issues[0]?.message ?? "Revisa el ajuste" });
  const d = parsed.data;
  const label = d.label === "Otro" ? (d.other ?? "Otro") : d.label;
  const list = [...parseAdjustments(v.adjustments), { label, percent: Math.round(d.percent * 10) / 10, note: d.note }];
  if (list.length > 8) back(v.id, { error: "Máximo 8 ajustes" });
  await prisma.valuation.update({ where: { id: v.id }, data: { adjustments: list as unknown as Prisma.InputJsonValue } });
  await audit(user, "valuation.adjust", "valuation", v.id, { label, percent: d.percent });
  back(v.id, { ok: "Ajuste agregado" });
}

export async function removeAdjustmentAction(form: FormData) {
  const user = await requireUser("properties.write");
  const v = await ownValuation(user, String(form.get("valuationId") ?? ""));
  const i = Number(form.get("index"));
  const list = parseAdjustments(v.adjustments).filter((_, j) => j !== i);
  await prisma.valuation.update({ where: { id: v.id }, data: { adjustments: list as unknown as Prisma.InputJsonValue } });
  back(v.id);
}
