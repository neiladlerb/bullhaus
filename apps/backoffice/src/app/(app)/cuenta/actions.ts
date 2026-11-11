"use server";
import { redirect } from "next/navigation";
import { passwordProblem } from "@bullhaus/core";
import { hashPassword, verifyPassword } from "@bullhaus/core/server";
import { prisma } from "@bullhaus/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

export interface PasswordState {
  ok: boolean;
  message: string;
}

export async function changePasswordAction(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const user = await requireUser(undefined, { allowPendingPasswordChange: true });
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, record.passwordHash))) {
    await audit(user, "user.password.change_failed", "user", user.id);
    return { ok: false, message: "La contraseña actual no es correcta." };
  }
  if (next !== confirm) return { ok: false, message: "La nueva contraseña y su confirmación no coinciden." };
  if (next === current) return { ok: false, message: "La nueva contraseña debe ser distinta de la actual." };
  const problem = passwordProblem(next, { email: user.email, name: user.name });
  if (problem) return { ok: false, message: `${problem}.` };

  const wasPending = record.mustChangePassword;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(next), mustChangePassword: false, passwordChangedAt: new Date() },
    }),
    // Cierra las sesiones abiertas en otros equipos; la actual sigue.
    prisma.session.deleteMany({ where: { userId: user.id, NOT: { tokenHash: user.sessionTokenHash } } }),
  ]);
  await audit(user, "user.password.change", "user", user.id);
  if (wasPending) redirect("/?contrasena=1");
  return { ok: true, message: "Contraseña actualizada. Se cerraron tus sesiones en otros equipos." };
}
