import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { can, type Permission, type Role } from "@bullhaus/core";
import { hashToken, newSessionToken, verifyPassword } from "@bullhaus/core/server";
import { prisma } from "@bullhaus/db";

export const SESSION_COOKIE = "bullhaus_session";
const SESSION_DAYS = 7;

export interface CurrentUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  /** Hash del token de la sesión actual, para cerrar las demás al cambiar la contraseña. */
  sessionTokenHash: string;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  const { id, tenantId, name, email, role, mustChangePassword } = session.user;
  return { id, tenantId, name, email, role, mustChangePassword, sessionTokenHash: tokenHash };
});

export const ACCOUNT_PATH = "/cuenta";

/**
 * Exige sesión y, si se indica, un permiso. Redirige al login o a inicio.
 * Quien tiene una contraseña temporal solo puede usar su cuenta hasta cambiarla.
 */
export async function requireUser(
  permission?: Permission,
  opts: { allowPendingPasswordChange?: boolean } = {},
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts.allowPendingPasswordChange) redirect(ACCOUNT_PATH);
  if (permission && !can(user.role, permission)) redirect("/?sin-permiso=1");
  return user;
}

export async function login(email: string, password: string): Promise<{ id: string; tenantId: string; mustChangePassword: boolean } | null> {
  const users = await prisma.user.findMany({ where: { email: email.trim().toLowerCase(), active: true } });
  for (const user of users) {
    if (await verifyPassword(password, user.passwordHash)) {
      const { token, tokenHash } = newSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
      await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } });
      (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
      });
      return { id: user.id, tenantId: user.tenantId, mustChangePassword: user.mustChangePassword };
    }
  }
  return null;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}
