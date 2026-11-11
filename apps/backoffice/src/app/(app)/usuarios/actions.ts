"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { passwordProblem, ROLES } from "@bullhaus/core";
import { generateTemporaryPassword, hashPassword } from "@bullhaus/core/server";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(3, "Nombre: obligatorio"),
  email: z.string().trim().toLowerCase().email("Email no válido"),
  phone: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(30).optional()),
  role: z.enum(ROLES),
  password: z.string().min(12, "La contraseña inicial debe tener al menos 12 caracteres"),
});

export async function createUserAction(
  _prev: { ok: boolean; message: string; values?: Record<string, string> },
  form: FormData,
): Promise<{ ok: boolean; message: string; values?: Record<string, string> }> {
  const admin = await requireUser("users.manage");
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? ""), role: String(form.get("role") ?? "") };
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues.map((i) => i.message).join(". "), values };
  const { password, ...data } = parsed.data;
  const problem = passwordProblem(password, { email: data.email, name: data.name });
  if (problem) return { ok: false, message: `${problem}.`, values };
  const exists = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: admin.tenantId, email: data.email } } });
  if (exists) return { ok: false, message: "Ya existe un usuario con ese email.", values };
  const user = await prisma.user.create({ data: { ...data, tenantId: admin.tenantId, passwordHash: await hashPassword(password), mustChangePassword: true } });
  await audit(admin, "user.create", "user", user.id, { email: user.email, role: user.role });
  revalidatePath("/usuarios");
  return { ok: true, message: `Usuario ${user.email} creado. Entrégale la contraseña inicial por un canal seguro: al entrar, tendrá que elegir una propia.` };
}

export async function updateUserAction(form: FormData): Promise<void> {
  const admin = await requireUser("users.manage");
  const id = String(form.get("id"));
  const role = z.enum(ROLES).safeParse(form.get("role"));
  const active = form.get("active") === "si";
  const target = await prisma.user.findFirst({ where: { id, tenantId: admin.tenantId } });
  if (!target || !role.success) return;
  // Un administrador no puede quitarse a sí mismo el rol ni desactivarse (evita quedarse sin acceso).
  if (target.id === admin.id && (role.data !== "admin" || !active)) return;
  await prisma.user.update({ where: { id }, data: { role: role.data, active } });
  if (!active) await prisma.session.deleteMany({ where: { userId: id } });
  await audit(admin, "user.update", "user", id, { role: { from: target.role, to: role.data }, active: { from: target.active, to: active } });
  revalidatePath("/usuarios");
}

export interface ResetState {
  ok: boolean;
  message: string;
  /** Contraseña temporal: se muestra una sola vez al administrador y no se guarda en ningún lado. */
  temporary?: string;
}

export async function resetPasswordAction(_prev: ResetState, form: FormData): Promise<ResetState> {
  const admin = await requireUser("users.manage");
  const id = String(form.get("id"));
  const target = await prisma.user.findFirst({ where: { id, tenantId: admin.tenantId } });
  if (!target) return { ok: false, message: "El usuario no existe." };
  if (target.id === admin.id) return { ok: false, message: "Tu propia contraseña se cambia en Mi cuenta." };
  if (!target.active) return { ok: false, message: "Activa al usuario antes de restablecer su contraseña." };

  const temporary = generateTemporaryPassword();
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(temporary), mustChangePassword: true, passwordChangedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);
  await audit(admin, "user.password.reset", "user", id, { email: target.email });
  return {
    ok: true,
    message: `Contraseña temporal de ${target.email}. Entrégasela por un canal seguro: al entrar, tendrá que elegir una propia.`,
    temporary,
  };
}
