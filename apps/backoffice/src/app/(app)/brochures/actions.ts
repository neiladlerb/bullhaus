"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can, seesOnlyOwnProperties, TYPE_LABELS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { newBrochureToken } from "@/lib/brochures";
import { hasDemoData } from "@/lib/demo";

// Flujo: borrador → en revisión → aprobado (lo aprueba administración) → se comparte.
// Cambiar el título o la bajada de un brochure aprobado lo devuelve a revisión.

export async function brochureEditor(): Promise<CurrentUser> {
  const user = await requireUser("leads.read");
  if (!can(user.role, "leads.write") && !can(user.role, "campaigns.write")) redirect("/brochures");
  return user;
}

async function find(user: CurrentUser, id: string) {
  return prisma.brochure.findFirst({ where: { id, tenantId: user.tenantId, ...(seesOnlyOwnProperties(user.role) ? { OR: [{ createdById: user.id }, { property: { brokerId: user.id } }] } : {}) } });
}
const idOf = (form: FormData) => z.string().min(1).parse(form.get("id"));
const refresh = (id: string) => {
  revalidatePath("/brochures");
  revalidatePath(`/brochures/${id}`);
};

export async function createBrochureAction(form: FormData): Promise<void> {
  const user = await brochureEditor();
  const kind = z.enum(["captacion", "venta", "arriendo"]).parse(form.get("kind"));
  const intro = z.string().trim().max(400).optional().parse(form.get("intro") || undefined);
  let title = z.string().trim().max(120).optional().parse(form.get("title") || undefined);
  let propertyId: string | null = null;
  let isDemo = false;
  if (kind !== "captacion") {
    const pid = z.string().min(1).parse(form.get("propertyId"));
    const p = await prisma.property.findFirst({
      where: { id: pid, tenantId: user.tenantId, status: "disponible", operation: kind, ...(seesOnlyOwnProperties(user.role) ? { brokerId: user.id } : {}) },
      select: { id: true, type: true, comuna: true, headline: true },
    });
    if (!p) redirect("/brochures?error=propiedad");
    propertyId = p.id;
    title ||= p.headline ?? `${TYPE_LABELS[p.type]} en ${kind} en ${p.comuna}`;
  } else {
    title ||= "Vende o arrienda tu propiedad con Bull Haus";
  }
  // Mientras haya demo cargada, lo que se crea es de demo: solo usa envíos simulados.
  isDemo = await hasDemoData(user.tenantId);
  const b = await prisma.brochure.create({ data: { tenantId: user.tenantId, kind, propertyId, title, intro: intro ?? null, token: newBrochureToken(), createdById: user.id, isDemo } });
  await audit(user, "brochure.create", "brochure", b.id, { kind });
  redirect(`/brochures/${b.id}`);
}

export async function updateBrochureAction(form: FormData): Promise<void> {
  const user = await brochureEditor();
  const b = await find(user, idOf(form));
  if (!b || b.status === "archivado") return;
  const title = z.string().trim().min(5).max(120).parse(form.get("title"));
  const intro = z.string().trim().max(400).parse(form.get("intro") ?? "");
  const changed = title !== b.title || (intro || null) !== b.intro;
  if (!changed) return;
  await prisma.brochure.update({ where: { id: b.id }, data: { title, intro: intro || null, ...(b.status === "aprobado" ? { status: "en_revision", approvedById: null, approvedAt: null } : {}) } });
  await audit(user, "brochure.edit", "brochure", b.id);
  refresh(b.id);
}

export async function submitBrochureAction(form: FormData): Promise<void> {
  const user = await brochureEditor();
  const b = await find(user, idOf(form));
  if (!b || b.status !== "borrador") return;
  await prisma.brochure.update({ where: { id: b.id }, data: { status: "en_revision" } });
  await audit(user, "brochure.submit", "brochure", b.id);
  refresh(b.id);
}

export async function approveBrochureAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const b = await find(user, idOf(form));
  if (!b || b.status !== "en_revision") return;
  await prisma.brochure.update({ where: { id: b.id }, data: { status: "aprobado", approvedById: user.id, approvedAt: new Date() } });
  await audit(user, "brochure.approve", "brochure", b.id);
  refresh(b.id);
}

export async function returnBrochureAction(form: FormData): Promise<void> {
  const user = await requireUser("campaigns.approve");
  const b = await find(user, idOf(form));
  if (!b || !["en_revision", "aprobado"].includes(b.status)) return;
  await prisma.brochure.update({ where: { id: b.id }, data: { status: "borrador", approvedById: null, approvedAt: null } });
  await audit(user, "brochure.return", "brochure", b.id);
  refresh(b.id);
}

export async function archiveBrochureAction(form: FormData): Promise<void> {
  const user = await brochureEditor();
  const b = await find(user, idOf(form));
  if (!b) return;
  await prisma.brochure.update({ where: { id: b.id }, data: { status: "archivado" } });
  await audit(user, "brochure.archive", "brochure", b.id);
  refresh(b.id);
}

/** Solo demo: simula que el contacto abrió el enlace que le enviamos (para mostrar la medición). */
export async function simulateOpenAction(form: FormData): Promise<void> {
  const user = await requireUser("leads.read");
  const share = await prisma.brochureShare.findFirst({ where: { id: idOf(form), tenantId: user.tenantId, isDemo: true } });
  if (!share) return;
  await prisma.$transaction([
    prisma.brochureShare.update({ where: { id: share.id }, data: { opens: { increment: 1 }, openedAt: share.openedAt ?? new Date() } }),
    prisma.brochure.update({ where: { id: share.brochureId }, data: { views: { increment: 1 } } }),
  ]);
  revalidatePath(`/brochures/${share.brochureId}`);
  revalidatePath("/envio-demo");
}
