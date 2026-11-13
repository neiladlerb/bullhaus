"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BrandSchema, brandError, brandFromForm } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

// Guarda la ficha de marca de la corredora del usuario. Solo con el permiso brand.manage y solo si
// la ficha completa pasa el esquema; un dato malo nunca llega a la web pública.
export async function saveBrandAction(form: FormData): Promise<void> {
  const user = await requireUser("brand.manage");
  const raw = Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : undefined]));
  const parsed = BrandSchema.safeParse(brandFromForm(raw));
  if (!parsed.success) redirect(`/marca?error=${encodeURIComponent(brandError(parsed.error.issues))}`);
  const data = parsed.data as unknown as Prisma.InputJsonValue;
  await prisma.tenantBrand.upsert({
    where: { tenantId: user.tenantId },
    update: { data, updatedById: user.id },
    create: { tenantId: user.tenantId, data, updatedById: user.id },
  });
  await audit(user, "brand.save", "tenant_brand", user.tenantId, { name: parsed.data.name });
  revalidatePath("/marca");
  redirect("/marca?ok=1");
}
