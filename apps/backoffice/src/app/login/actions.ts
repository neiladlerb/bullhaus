"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { ACCOUNT_PATH, login, logout, getCurrentUser } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function loginAction(_prev: { error: string }, form: FormData): Promise<{ error: string }> {
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Revisa el email y la contraseña." };
  let user: Awaited<ReturnType<typeof login>>;
  try {
    user = await login(parsed.data.email, parsed.data.password);
  } catch (e) {
    // Base de datos sin configurar o caída: mensaje claro en vez de una pantalla de error.
    console.error("login: no se pudo consultar la base de datos", e instanceof Error ? e.name : "error");
    return { error: "El sistema no puede conectarse a la base de datos. Avisa al administrador." };
  }
  if (!user) return { error: "Email o contraseña incorrectos." };
  await audit(user, "auth.login", "user", user.id);
  redirect(user.mustChangePassword ? ACCOUNT_PATH : "/");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await audit(user, "auth.logout", "user", user.id);
  await logout();
  redirect("/login");
}
